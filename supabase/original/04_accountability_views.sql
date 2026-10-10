-- Dashboard views (demo values, scale is 0-100 for on_time_rate)
create or replace view public.accountability_departments as
select * from (values
  ('Public Works Department', 80::float8, 1.2::float8, 0, 0),
  ('Storm Drain Authority',   75::float8, 2.0::float8, 2, 0),
  ('Electricity Distribution',50::float8, 3.5::float8, 1, 0),
  ('Water Supply Board',      50::float8, 1.5::float8, 1, 2)
) as t(name, on_time_rate, avg_delay_days, repeat_digs, verified_reports);

create or replace view public.accountability_contractors as
select * from (values
  ('Urban Dig Co',          85::float8, 1.0::float8, 0, 0),
  ('Metro Civil Works',     70::float8, 2.1::float8, 1, 0),
  ('Apex Infra',            60::float8, 2.8::float8, 1, 2),
  ('BlueLine Contractors',  45::float8, 4.0::float8, 2, 0),
  ('Shree Constructions',   30::float8, 5.5::float8, 3, 6)
) as t(name, on_time_rate, avg_delay_days, repeat_digs, verified_reports);

grant select on public.accountability_departments, public.accountability_contractors to anon, authenticated;
notify pgrst, 'reload schema';