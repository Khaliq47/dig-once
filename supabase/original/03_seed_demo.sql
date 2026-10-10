-- 03_seed_demo.sql  |  Run in Supabase SQL Editor AFTER 01 and 02.
-- Creates 30 demo roads around a centre point + ~32 projects with planted conflicts.
-- CHANGE v_lat / v_lon below to your own area (Google Maps: right-click -> copy coordinates).
-- WARNING: wipes roads, projects, users, reports, follows every time it runs.

truncate reports, follows, projects, users, roads restart identity cascade;

create or replace function seed_add_project(
  p_road bigint, p_type text, p_status text, p_s int, p_e int, p_delay text default null
) returns void language sql as $f$
  insert into projects (title, type, department, contractor, budget, start_date, end_date,
                        status, delay_reason, road_id, geom)
  select
    (case p_type when 'resurfacing' then 'Resurfacing' when 'pipeline' then 'Water main'
                 when 'drainage' then 'Drain repair' else 'Underground cable' end) || ' - ' || r.name,
    p_type,
    case p_type when 'resurfacing' then 'Public Works Department' when 'pipeline' then 'Water Supply Board'
                when 'drainage' then 'Storm Drain Authority' else 'Electricity Distribution' end,
    (array['Apex Infra','Shree Constructions','Metro Civil Works','BlueLine Contractors','Urban Dig Co'])[1 + (r.id % 5)::int],
    ((r.id % 9) + 1) * 500000,
    current_date + p_s, current_date + p_e, p_status, p_delay, r.id, r.geom
  from roads r where r.id = p_road;
$f$;

do $$
declare
  v_lat double precision := 12.9370;   -- <<< CHANGE: centre latitude
  v_lon double precision := 77.6200;   -- <<< CHANGE: centre longitude
  names text[] := array['Gandhi Street','Nehru Road','Temple Road','Market Street','Station Road',
    'Lake View Road','School Lane','Mill Road','Bazaar Street','Church Road','Park Avenue','Canal Road',
    'Hospital Road','Library Lane','Garden Street','College Road','Bus Stand Road','Tank Street',
    'Main Road','Cross Road','River Road','Orchard Lane','Fort Road','Mosque Street','Post Office Road',
    'Industrial Road','Highway Link','Ring Road','Old Town Road','New Colony Road'];
  half double precision := 600 / (111320 * cos(radians(v_lat)));  -- 600 m each side
  y double precision; i int; rid bigint[]; typ text; s int; e int; st text;
begin
  for i in 1..30 loop
    y := v_lat + (i - 15) * 0.00135;  -- parallel roads ~150 m apart
    insert into roads (name, highway, geom) values (names[i], 'residential',
      ST_SetSRID(ST_MakeLine(array[
        ST_MakePoint(v_lon - half, y), ST_MakePoint(v_lon - half/2, y + 0.00003),
        ST_MakePoint(v_lon, y), ST_MakePoint(v_lon + half/2, y - 0.00003),
        ST_MakePoint(v_lon + half, y)]), 4326));
  end loop;
  select array_agg(id order by id) into rid from roads;

  -- A: resurfaced recently, then water main planned -> NO_DIG_PERIOD (hero demo)
  perform seed_add_project(rid[1], 'resurfacing', 'completed', -75, -50);
  perform seed_add_project(rid[1], 'pipeline', 'planned', 30, 60);
  -- B: three departments on one stretch -> bundling
  perform seed_add_project(rid[2], 'pipeline', 'ongoing', -5, 20);
  perform seed_add_project(rid[2], 'drainage', 'planned', 10, 35);
  perform seed_add_project(rid[2], 'cable', 'planned', 25, 50);
  -- C: resurfacing before drainage -> WRONG_ORDER
  perform seed_add_project(rid[3], 'resurfacing', 'planned', 20, 35);
  perform seed_add_project(rid[3], 'drainage', 'planned', 50, 75);
  -- D: delayed project
  perform seed_add_project(rid[4], 'pipeline', 'delayed', -60, 10, 'Contractor waiting on pipe delivery');

  -- Fillers: one per road, no accidental conflicts
  for i in 5..30 loop
    typ := (array['resurfacing','pipeline','drainage','cable'])[1 + (i % 4)];
    s := ((i * 37) % 700) - 400;
    e := s + 10 + (i % 30);
    st := case when e < 0 then 'completed' when s <= 0 then 'ongoing' else 'planned' end;
    perform seed_add_project(rid[i], typ, st, s, e);
  end loop;
end $$;

drop function seed_add_project(bigint, text, text, int, int, text);

insert into users (name, email, role) values
  ('Asha Resident', 'asha@example.com', 'citizen'),
  ('Ravi Resident', 'ravi@example.com', 'citizen'),
  ('PWD Officer', 'pwd@example.com', 'department');
insert into follows (user_id, project_id) values (1, 1), (1, 2), (2, 3);
insert into reports (project_id, user_id, message) values
  (3, 2, 'Trench left open overnight near the bus stop'),
  (8, 1, 'No work seen for two weeks');

-- Self-test: should return one NO_DIG_PERIOD row
select conflict_type, severity, message from check_conflicts(
  'pipeline', current_date + 40, current_date + 60, (select geom from roads order by id limit 1));
