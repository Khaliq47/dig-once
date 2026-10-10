-- 02_conflict_engine.sql  |  Run after 01_schema.sql

-- ---------------------------------------------------------------
-- check_conflicts: finds nearby projects (ST_DWithin, metres) and
-- applies the rules:
--   NO_DIG_PERIOD      (high)   dig within 365 days after resurfacing
--   WRONG_ORDER        (medium) surface work before / overlapping underground work
--   BUNDLE_OPPORTUNITY (low/medium) overlapping or within 30 days -> bundle, est. days saved
-- Underground = pipeline, drainage, cable.  Surface = resurfacing.
-- ---------------------------------------------------------------
create or replace function check_conflicts(
  p_type text, p_start date, p_end date, p_geom geometry,
  p_radius_m int default 50, p_exclude_id bigint default null
) returns table (
  project_id bigint, title text, department text, type text, status text,
  start_date date, end_date date, distance_m int,
  conflict_type text, severity text, message text, days_saved int
) language sql stable as $$
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
$$;

-- ---------------------------------------------------------------
-- submit_project: validates, finds conflicts, optionally inserts.
-- p = {title,type,department,contractor,budget,start_date,end_date,status,geometry(GeoJSON)}
-- p_commit=false -> live preview while the form is being filled in
-- ---------------------------------------------------------------
create or replace function submit_project(p jsonb, p_commit boolean default false)
returns jsonb language plpgsql as $$
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
end $$;

-- GeoJSON of all projects for the map
create or replace function projects_geojson() returns jsonb language sql stable as $$
  select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
    jsonb_build_object('type', 'Feature', 'geometry', ST_AsGeoJSON(geom)::jsonb,
      'properties', to_jsonb(p) - 'geom')), '[]'::jsonb))
  from projects p;
$$;

-- Quick test after seeding (should return a NO_DIG_PERIOD row):
-- select * from check_conflicts('pipeline', current_date + 40, current_date + 60,
--   (select geom from roads order by id limit 1));
