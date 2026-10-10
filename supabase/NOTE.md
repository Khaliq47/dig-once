# Database scripts

The live database was built step by step in the Supabase SQL Editor, so these
scripts are a record of the work, not a one-command setup.

- `original/` holds Person 1's first schema, conflict engine and seed data.
  They use bigint ids and have since been superseded. They also drop and
  truncate tables, so never run them on a database that has data.
- `person3_reports.sql` adds reports, votes, status trail and stall detection.
- `seed_reports.sql` adds demo reports (run after the projects seed and after
  the demo users exist).
- `04_accountability_views.sql` creates the dashboard views.

The live app at https://dig-once.vercel.app uses a hosted Supabase project,
so judges do not need to run any of this.