-- =====================================================================
-- Demo data for Person 3. Run AFTER person3_reports.sql, after Person 1's
-- seed (needs >= 3 projects) and after at least 4 users exist in auth.users
-- (create them with Person 4's demo logins first).
-- Runs in the SQL editor as the postgres role, so it bypasses RLS and
-- impersonates users by id. Safe to re-run: it clears old demo reports first.
-- =====================================================================
do $$
declare
  u uuid[];
  pr uuid[];
  pt geometry;
  r1 uuid; r2 uuid; r3 uuid; r4 uuid; r5 uuid; r6 uuid; r7 uuid; r8 uuid;
begin
  select array_agg(id order by created_at) into u from (select id, created_at from auth.users limit 5) x;
  select array_agg(id order by id) into pr from (select id from projects limit 3) x;
  if coalesce(array_length(u,1),0) < 4 then raise exception 'Create at least 4 users first'; end if;
  if coalesce(array_length(pr,1),0) < 3 then raise exception 'Seed at least 3 projects first'; end if;

  delete from reports where note like '[demo]%';

  -- helper: a point on project N, nudged east by a few metres
  -- 1) Submitted: browser location, no votes yet
  select ST_PointOnSurface(geom) into pt from projects where id = pr[1];
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[1],u[1],'delay','[demo] Barricades up for two weeks, no workers seen',
          ST_SetSRID(ST_MakePoint(ST_X(pt),ST_Y(pt)),4326)::geography,'browser') returning id into r1;

  -- 2) Forwarded: EXIF location (trust 2) + 2 confirms = 4
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[1],u[2],'poor_quality','[demo] Trench backfilled badly, already sinking',
          ST_SetSRID(ST_MakePoint(ST_X(pt)+0.0004,ST_Y(pt)),4326)::geography,'exif') returning id into r2;
  insert into report_votes(report_id,user_id,vote) values (r2,u[1],'confirm'),(r2,u[3],'confirm');

  -- 3) Resolved: verified, then the department resolves it
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[1],u[3],'safety','[demo] Open manhole beside the trench',
          ST_SetSRID(ST_MakePoint(ST_X(pt)-0.0004,ST_Y(pt)),4326)::geography,'exif') returning id into r3;
  insert into report_votes(report_id,user_id,vote) values (r3,u[1],'confirm'),(r3,u[2],'confirm');
  update reports set status='resolved', resolved_at=now() where id=r3;
  insert into report_events(report_id,status,note) values (r3,'resolved','Cover replaced by the Water Board');

  -- 4) Flagged: reported from far away (location check fails)
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[1],u[4],'abandoned','[demo] Reported from 3 km away',
          ST_SetSRID(ST_MakePoint(ST_X(pt)+0.03,ST_Y(pt)),4326)::geography,'manual') returning id into r4;

  -- 5+6) Duplicate pair: same project, category and place within 48h
  select ST_PointOnSurface(geom) into pt from projects where id = pr[2];
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[2],u[1],'safety','[demo] Loose cables on the pavement',
          ST_SetSRID(ST_MakePoint(ST_X(pt),ST_Y(pt)),4326)::geography,'browser') returning id into r5;
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[2],u[2],'safety','[demo] Exposed wires near the pit',
          ST_SetSRID(ST_MakePoint(ST_X(pt)+0.0002,ST_Y(pt)),4326)::geography,'browser') returning id into r6;

  -- 7+8) STALL DEMO on project 3: two verified 'abandoned' reports.
  -- Make sure that project's official status is 'ongoing' for the live demo.
  update projects set status='ongoing', stall_reason=null, stalled_flagged_at=null,
                      updated_at=now() where id = pr[3];
  select ST_PointOnSurface(geom) into pt from projects where id = pr[3];
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[3],u[1],'abandoned','[demo] Nobody has worked here for three weeks',
          ST_SetSRID(ST_MakePoint(ST_X(pt),ST_Y(pt)),4326)::geography,'exif') returning id into r7;
  insert into report_votes(report_id,user_id,vote) values (r7,u[2],'confirm'),(r7,u[3],'confirm');
  insert into reports(project_id,user_id,category,note,geom,location_source)
  values (pr[3],u[4],'abandoned','[demo] Machines gone, pit still open',
          ST_SetSRID(ST_MakePoint(ST_X(pt)+0.0007,ST_Y(pt)),4326)::geography,'exif') returning id into r8;
  insert into report_votes(report_id,user_id,vote) values (r8,u[2],'confirm'),(r8,u[3],'confirm');

  raise notice 'Demo reports ready. Now run: select * from run_stall_check();  (project % flips to possibly_stalled)', pr[3];
end $$;
