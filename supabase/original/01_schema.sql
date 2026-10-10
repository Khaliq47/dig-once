-- 01_schema.sql  |  Run in Supabase -> SQL Editor
create extension if not exists postgis;

drop table if exists reports, follows, projects, roads, users cascade;

create table users (
  id bigserial primary key,
  name text not null,
  email text unique not null,
  role text not null default 'citizen' check (role in ('citizen','department','admin'))
);

create table roads (
  id bigserial primary key,
  osm_id bigint unique,
  name text,
  highway text,
  geom geometry(LineString, 4326) not null
);
create index roads_geom_idx on roads using gist (geom);

create table projects (
  id bigserial primary key,
  title text not null,
  type text not null check (type in ('resurfacing','pipeline','drainage','cable','other')),
  department text not null,
  contractor text,
  budget numeric,
  start_date date not null,
  end_date date not null,
  status text not null default 'planned'
    check (status in ('planned','ongoing','completed','delayed')),
  delay_reason text,
  road_id bigint references roads(id),
  geom geometry(Geometry, 4326) not null,
  created_at timestamptz default now(),
  constraint dates_ok check (end_date >= start_date)
);
create index projects_geom_idx on projects using gist (geom);
-- geography index so ST_DWithin(...::geography, metres) is fast
create index projects_geog_idx on projects using gist ((geom::geography));
create index roads_geog_idx on roads using gist ((geom::geography));

create table reports (
  id bigserial primary key,
  project_id bigint not null references projects(id) on delete cascade,
  user_id bigint references users(id),
  message text not null,
  created_at timestamptz default now()
);

create table follows (
  user_id bigint references users(id) on delete cascade,
  project_id bigint references projects(id) on delete cascade,
  primary key (user_id, project_id)
);
