CREATE OR REPLACE FUNCTION public.check_conflicts(p_type text, p_start date, p_end date, p_geom geometry, p_radius_m integer DEFAULT 50, p_exclude_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(project_id bigint, title text, department text, type text, status text, start_date date, end_date date, distance_m integer, conflict_type text, severity text, message text, days_saved integer)
 LANGUAGE sql
 STABLE
AS $function$
  with cand as (
    select o.*,
      round(ST_Distance(o.geom::geography, p_geom::geography))::int as dist,
      (o.type in ('pipeline','drainage','cable')) as o_ug,
      (o.type = 'resurfacing') as o_surf,
      (p_type in ('pipeline','drainage','cable')) as p_ug,
      (p_type = 'resurfacing') as p_surf,
      (o.start_date <= p_end and o.end_date >= p_start) as overlaps,
      greatest(1, round(0.3 * least(p_end - p_start + 1, o.end_date - o.start_date + 1))::int) as saved
    from projects o
    where ST_DWithin(o.geom::geography, p_geom::geography, p_radius_m)
      and (p_exclude_id is null or o.id <> p_exclude_id)
  ), classified as (
    select c.*,
      case
        when c.o_surf and c.p_ug and c.end_date <= p_start and p_start - c.end_date < 365
          then 'NO_DIG_PERIOD'
        when c.p_surf and c.o_ug and c.start_date >= p_end and c.start_date - p_end < 365
          then 'WRONG_ORDER'
        when c.overlaps and ((c.o_surf and c.p_ug) or (c.p_surf and c.o_ug))
          then 'WRONG_ORDER'
        when c.overlaps
          or (c.start_date - p_end between 0 and 30)
          or (p_start - c.end_date between 0 and 30)
          then 'BUNDLE_OPPORTUNITY'
      end as ctype
    from cand c
  )
  select c.id, c.title, c.department, c.type, c.status, c.start_date, c.end_date, c.dist,
    c.ctype,
    case c.ctype
      when 'NO_DIG_PERIOD' then 'high'
      when 'WRONG_ORDER' then 'medium'
      else case when c.overlaps then 'medium' else 'low' end
    end,
    case c.ctype
      when 'NO_DIG_PERIOD' then
        format('%s finished resurfacing %s days before this dig. Recommended no-dig period is 365 days.',
               c.department, p_start - c.end_date)
      when 'WRONG_ORDER' then
        case when c.overlaps then
          format('Surface and underground work overlap here (%s). Underground work should finish before resurfacing starts.', c.title)
        else
          format('This resurfacing ends %s days before %s plans underground work. Do underground work first.',
                 c.start_date - p_end, c.department)
        end
      else
        format('%s has work here (%s to %s). Bundle the jobs to save about %s days and avoid digging twice.',
               c.department, c.start_date, c.end_date, c.saved)
    end,
    case when c.ctype = 'BUNDLE_OPPORTUNITY' then c.saved end
  from classified c
  where c.ctype is not null
  order by case c.ctype when 'NO_DIG_PERIOD' then 1 when 'WRONG_ORDER' then 2 else 3 end, c.dist;
$function$


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.is_department()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('department','admin')
  );
$function$


CREATE OR REPLACE FUNCTION public.my_department()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select department_name from public.profiles
  where id = auth.uid() and role = 'department'
$function$


CREATE OR REPLACE FUNCTION public.projects_geojson()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
    jsonb_build_object('type', 'Feature', 'geometry', ST_AsGeoJSON(geom)::jsonb,
      'properties', to_jsonb(p) - 'geom')), '[]'::jsonb))
  from projects p;
$function$


CREATE OR REPLACE FUNCTION public.recompute_report(rid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$


CREATE OR REPLACE FUNCTION public.report_rules()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.reports_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into report_events(report_id, status, note) values (
    new.id, new.status,
    case when new.status = 'flagged'
         then format('Location is %s m from the project, so it was not accepted', new.distance_to_project_m)
         when new.duplicate_of is not null
         then 'Submitted (similar report already exists nearby)'
         else 'Report submitted' end);
  return new;
end $function$


CREATE OR REPLACE FUNCTION public.reports_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
end $function$


CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id uuid, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not is_department() then raise exception 'Only departments can resolve reports'; end if;
  update reports set status = 'resolved', resolved_at = now()
   where id = p_report_id and status = 'forwarded';
  if not found then raise exception 'Report is not awaiting resolution'; end if;
  insert into report_events(report_id, status, note)
    values (p_report_id, 'resolved', coalesce(nullif(trim(p_note), ''), 'Marked resolved by the department'));
end $function$


CREATE OR REPLACE FUNCTION public.run_stall_check()
 RETURNS TABLE(project_id bigint, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$


CREATE OR REPLACE FUNCTION public.submit_project(p jsonb, p_commit boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_errors text[] := '{}';
  v_start date; v_end date; v_geom geometry; v_road roads%rowtype;
  v_type text := p->>'type';
  v_conf jsonb := '[]'::jsonb; v_id bigint;
begin
  if coalesce(trim(p->>'title'), '') = '' then v_errors := v_errors || 'Title is required'; end if;
  if v_type is null or v_type not in ('resurfacing','pipeline','drainage','cable','other') then
    v_errors := v_errors || 'Invalid project type';
  end if;
  if coalesce(trim(p->>'department'), '') = '' then v_errors := v_errors || 'Department is required'; end if;

  begin
    v_start := (p->>'start_date')::date; v_end := (p->>'end_date')::date;
    if v_start is null or v_end is null then
      v_errors := v_errors || 'Start and end dates are required';
    elsif v_end < v_start then
      v_errors := v_errors || 'End date cannot be before start date';
    elsif v_end - v_start > 1095 then
      v_errors := v_errors || 'Project duration over 3 years looks wrong';
    end if;
  exception when others then
    v_errors := v_errors || 'Invalid date format (use YYYY-MM-DD)';
  end;

  begin
    v_geom := ST_SetSRID(ST_GeomFromGeoJSON((p->'geometry')::text), 4326);
  exception when others then
    v_errors := v_errors || 'Invalid or missing geometry';
  end;

  if v_geom is not null then
    select * into v_road from roads
      where ST_DWithin(geom::geography, v_geom::geography, 20)
      order by ST_Distance(geom::geography, v_geom::geography) limit 1;
    if not found then
      v_errors := v_errors || 'Project does not touch any known road (nearest road must be within 20 m)';
    elsif v_start is not null and exists (
      select 1 from projects
      where lower(title) = lower(p->>'title') and department = p->>'department'
        and type = v_type and start_date = v_start
        and ST_DWithin(geom::geography, v_geom::geography, 20)
    ) then
      v_errors := v_errors || 'Duplicate submission: same project already exists';
    end if;
  end if;

  if array_length(v_errors, 1) > 0 then
    return jsonb_build_object('valid', false, 'errors', to_jsonb(v_errors), 'conflicts', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_conf
  from check_conflicts(v_type, v_start, v_end, v_geom) c;

  if p_commit then
    insert into projects (title, type, department, contractor, budget, start_date, end_date,
                          status, road_id, geom)
    values (p->>'title', v_type, p->>'department', p->>'contractor',
            nullif(p->>'budget', '')::numeric, v_start, v_end,
            coalesce(p->>'status', 'planned'), v_road.id, v_geom)
    returning id into v_id;
  end if;

  return jsonb_build_object('valid', true, 'errors', '[]'::jsonb, 'road', v_road.name,
                            'conflicts', v_conf, 'project_id', v_id);
exception when others then
  return jsonb_build_object('valid', false, 'errors', jsonb_build_array(sqlerrm), 'conflicts', '[]'::jsonb);
end $function$


CREATE OR REPLACE FUNCTION public.submit_report(p_project_id bigint, p_category text, p_note text, p_photo_path text, p_lat double precision, p_lng double precision, p_source text)
 RETURNS reports
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
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
end $function$


CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ begin new.updated_at := now(); return new; end $function$


CREATE OR REPLACE FUNCTION public.votes_after_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform recompute_report(coalesce(new.report_id, old.report_id));
  return null;
end $function$


CREATE OR REPLACE FUNCTION public.votes_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
