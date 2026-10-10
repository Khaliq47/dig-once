-- =====================================================================
-- DigOnce - Person 3: reports, verification, status trail, stall check
-- Run in the Supabase SQL editor AFTER Person 1's `projects` table exists
-- and Person 4's `profiles` table (id, role) exists.
--
-- ASSUMPTIONS about other people's tables (edit the names if they differ):
--   projects(id uuid, title text, geom geometry(Geometry,4326),
--            status text, start_date date, updated_at timestamptz)
--   profiles(id uuid references auth.users, role text)  -- 'citizen' | 'department'
-- =====================================================================

create extension if not exists postgis;

-- ---------- tunable rules (change here, nowhere else) ----------------
create or replace function report_rules() returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'max_distance_m',        150,   -- report must be this close to the project
    'duplicate_radius_m',     50,   -- same project + category within this radius ...
    'duplicate_window_hours', 48,   -- ... and this time window = duplicate
    'verify_threshold',        4,   -- trust score needed to become Verified
    'reject_threshold',       -2,   -- trust score at/below which it is rejected
    'stall_min_reports',       2,   -- verified contradicting reports needed
    'stall_report_days',     30,    -- ... within this many days
    'stall_no_update_days',   7     -- no official update this long after start
  );
$$;

-- ---------- projects: columns the stall check writes ------------------
alter table projects add column if not exists stall_reason text;
alter table projects add column if not exists stalled_flagged_at timestamptz;
-- If projects.status is a Postgres ENUM, also run:
--   alter type <your_status_enum> add value if not exists 'possibly_stalled';

-- ---------- helper: is the caller a department user? ------------------
create or replace function is_department() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'department'
  );
$$;

-- ---------- tables ----------------------------------------------------
create table if not exists reports (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references projects(id) on delete cascade,
  user_id                uuid not null default auth.uid() references auth.users(id),
  category               text not null check (category in
                           ('abandoned','not_completed','delay','poor_quality','safety','other')),
  note                   text check (char_length(note) <= 1000),
  photo_path             text,
  geom                   geography(Point,4326) not null,
  location_source        text not null check (location_source in ('exif','browser','manual')),
  distance_to_project_m  numeric,
  status                 text not null default 'submitted' check (status in
                           ('submitted','flagged','verified','forwarded','resolved','rejected')),
  ai_status              text not null default 'pending' check (ai_status in
                           ('pending','classified','unclassified')),
  ai_category            text check (ai_category in ('road_cut','drain','pipeline','other')),
  ai_confidence          numeric check (ai_confidence between 0 and 1),
  duplicate_of           uuid references reports(id) on delete set null,
  confirm_count          int not null default 0,
  dispute_count          int not null default 0,
  trust_score            numeric not null default 0,
  verified_at            timestamptz,
  resolved_at            timestamptz,
  created_at             timestamptz not null default now()
);
create index if not exists reports_project_idx on reports(project_id, created_at desc);
create index if not exists reports_geom_idx    on reports using gist(geom);
create index if not exists reports_user_idx    on reports(user_id);

create table if not exists report_votes (
  report_id   uuid not null references reports(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id),
  vote        text not null check (vote in ('confirm','dispute')),
  created_at  timestamptz not null default now(),
  primary key (report_id, user_id)          -- one vote per user, enforced by the DB
);

create table if not exists report_events (
  id          bigint generated always as identity primary key,
  report_id   uuid not null references reports(id) on delete cascade,
  status      text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists report_events_idx on report_events(report_id, created_at);

-- ---------- BEFORE INSERT on reports: server-side truth ---------------
-- Clients cannot choose status, counts, AI fields or duplicate flags.
create or replace function reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rules jsonb := report_rules();
  dist  numeric;
  dup   uuid;
begin
  select ST_Distance(p.geom::geography, new.geom) into dist
    from projects p where p.id = new.project_id;
  if dist is null then
    raise exception 'Project not found or has no location';
  end if;

  new.distance_to_project_m := round(dist);
  new.status := case when dist <= (rules->>'max_distance_m')::numeric
                     then 'submitted' else 'flagged' end;

  select r.id into dup from reports r
   where r.project_id = new.project_id
     and r.category   = new.category
     and r.status not in ('rejected','flagged')
     and r.created_at > now() - make_interval(hours => (rules->>'duplicate_window_hours')::int)
     and ST_DWithin(r.geom, new.geom, (rules->>'duplicate_radius_m')::numeric)
   order by r.created_at limit 1;
  new.duplicate_of := dup;

  new.confirm_count := 0;  new.dispute_count := 0;
  new.trust_score := case new.location_source when 'exif' then 2 when 'browser' then 1 else 0 end;
  new.ai_status := 'pending'; new.ai_category := null; new.ai_confidence := null;
  new.verified_at := null;    new.resolved_at := null;
  return new;
end $$;

drop trigger if exists trg_reports_before_insert on reports;
create trigger trg_reports_before_insert before insert on reports
  for each row execute function reports_before_insert();

-- ---------- AFTER INSERT on reports: first timeline event -------------
create or replace function reports_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into report_events(report_id, status, note) values (
    new.id, new.status,
    case when new.status = 'flagged'
         then format('Location is %s m from the project, so it was not accepted', new.distance_to_project_m)
         when new.duplicate_of is not null
         then 'Submitted (similar report already exists nearby)'
         else 'Report submitted' end);
  return new;
end $$;

drop trigger if exists trg_reports_after_insert on reports;
create trigger trg_reports_after_insert after insert on reports
  for each row execute function reports_after_insert();

-- ---------- guard votes ------------------------------------------------
create or replace function votes_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare r reports;
begin
  select * into r from reports where id = new.report_id;
  if not found then raise exception 'Report not found'; end if;
  if r.user_id = new.user_id then
    raise exception 'You cannot vote on your own report';
  end if;
  if r.status not in ('submitted') then
    raise exception 'This report is no longer open for voting';
  end if;
  return new;
end $$;

drop trigger if exists trg_votes_before_write on report_votes;
create trigger trg_votes_before_write before insert or update on report_votes
  for each row execute function votes_before_write();

-- ---------- recompute trust + move status ------------------------------
create or replace function recompute_report(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  rules jsonb := report_rules();
  r reports; c int; d int; base numeric; t numeric;
begin
  select * into r from reports where id = rid for update;
  if not found then return; end if;

  select count(*) filter (where vote = 'confirm'),
         count(*) filter (where vote = 'dispute')
    into c, d from report_votes where report_id = rid;

  base := case r.location_source when 'exif' then 2 when 'browser' then 1 else 0 end;
  t := base + c - d;

  update reports set confirm_count = c, dispute_count = d, trust_score = t where id = rid;

  if r.status = 'submitted' and t >= (rules->>'verify_threshold')::numeric then
    update reports set status = 'verified', verified_at = now() where id = rid;
    insert into report_events(report_id, status, note)
      values (rid, 'verified', 'Confirmed by residents');
    -- the department is notified automatically
    update reports set status = 'forwarded' where id = rid;
    insert into report_events(report_id, status, note)
      values (rid, 'forwarded', 'Sent to the responsible department');
  elsif r.status = 'submitted' and t <= (rules->>'reject_threshold')::numeric then
    update reports set status = 'rejected' where id = rid;
    insert into report_events(report_id, status, note)
      values (rid, 'rejected', 'Disputed by residents');
  end if;
end $$;

create or replace function votes_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform recompute_report(coalesce(new.report_id, old.report_id));
  return null;
end $$;

drop trigger if exists trg_votes_after_write on report_votes;
create trigger trg_votes_after_write after insert or update or delete on report_votes
  for each row execute function votes_after_write();

-- ---------- RPC: submit a report (called by the Next.js API route) -----
create or replace function submit_report(
  p_project_id uuid, p_category text, p_note text, p_photo_path text,
  p_lat double precision, p_lng double precision, p_source text
) returns reports
language plpgsql security invoker set search_path = public as $$
declare r reports;
begin
  if auth.uid() is null then raise exception 'Log in to submit a report'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid coordinates';
  end if;
  if p_photo_path is not null and p_photo_path not like auth.uid()::text || '/%' then
    raise exception 'Invalid photo path';
  end if;

  insert into reports(project_id, category, note, photo_path, geom, location_source)
  values (p_project_id, p_category, nullif(trim(p_note), ''), p_photo_path,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_source)
  returning * into r;
  return r;
end $$;

-- ---------- RPC: department resolves a forwarded report ----------------
create or replace function resolve_report(p_report_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_department() then raise exception 'Only departments can resolve reports'; end if;
  update reports set status = 'resolved', resolved_at = now()
   where id = p_report_id and status = 'forwarded';
  if not found then raise exception 'Report is not awaiting resolution'; end if;
  insert into report_events(report_id, status, note)
    values (p_report_id, 'resolved', coalesce(nullif(trim(p_note), ''), 'Marked resolved by the department'));
end $$;

-- ---------- stall detection --------------------------------------------
-- Rule A: still planned/ongoing, start date long past, no official update.
-- Rule B: official status says ongoing/completed, but enough verified
--         residents' reports say abandoned/not completed.
create or replace function run_stall_check()
returns table(project_id uuid, reason text)
language plpgsql security definer set search_path = public as $$
declare rules jsonb := report_rules();
begin
  return query
  with flagged as (
    select p.id,
      case
        when (select count(*) from reports r
               where r.project_id = p.id and r.verified_at is not null
                 and r.category in ('abandoned','not_completed')
                 and r.created_at > now() - make_interval(days => (rules->>'stall_report_days')::int)
             ) >= (rules->>'stall_min_reports')::int
          then 'Verified resident reports disagree with the official status'
        when p.status in ('planned','ongoing')
             and p.start_date < current_date - (rules->>'stall_no_update_days')::int
             and p.updated_at < now() - make_interval(days => (rules->>'stall_no_update_days')::int)
          then 'No activity recorded since the start date'
      end as why
    from projects p
    where p.status in ('planned','ongoing','completed')
  )
  update projects p
     set status = 'possibly_stalled', stall_reason = f.why, stalled_flagged_at = now()
    from flagged f
   where p.id = f.id and f.why is not null
  returning p.id, f.why;
end $$;

revoke all on function recompute_report(uuid) from public, anon, authenticated;
revoke all on function run_stall_check() from public, anon, authenticated;
grant execute on function run_stall_check() to service_role;

-- ---------- Row Level Security ------------------------------------------
alter table reports       enable row level security;
alter table report_votes  enable row level security;
alter table report_events enable row level security;

drop policy if exists reports_read   on reports;
drop policy if exists reports_insert on reports;
create policy reports_read on reports for select
  using (status <> 'flagged' or user_id = auth.uid() or is_department());
create policy reports_insert on reports for insert to authenticated
  with check (user_id = auth.uid());
-- no update/delete policies: only triggers and security-definer functions change reports

drop policy if exists votes_read   on report_votes;
drop policy if exists votes_insert on report_votes;
drop policy if exists votes_update on report_votes;
drop policy if exists votes_delete on report_votes;
create policy votes_read   on report_votes for select using (user_id = auth.uid());
create policy votes_insert on report_votes for insert to authenticated with check (user_id = auth.uid());
create policy votes_update on report_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy votes_delete on report_votes for delete to authenticated using (user_id = auth.uid());

drop policy if exists events_read on report_events;
create policy events_read on report_events for select
  using (exists (select 1 from reports r where r.id = report_id));  -- inherits report visibility

-- ---------- Storage bucket for photos ------------------------------------
insert into storage.buckets (id, name, public) values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

drop policy if exists "photos upload own folder" on storage.objects;
create policy "photos upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);
-- reads work through the bucket's public URL
