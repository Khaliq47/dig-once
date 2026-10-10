# Person 3 module: reports, verification, status trail, stall detection, photo AI

## 1. Install (in the team repo, on your own branch)
```bash
npm i exifr browser-image-compression react-leaflet leaflet
npm i -D @types/leaflet
```
Copy these from the zip into the repo root (they are all new files except `app/reports/page.tsx`, which replaces the placeholder):
`lib/reports/`, `components/reports/`, `app/api/reports/`, `app/api/cron/`, `app/reports/` (page.tsx, new/, [id]/).
`vercel.json`: only copy if the repo has none; otherwise add the `crons` entry to the existing one.
Then open `lib/reports/client.ts` and, if the team already has a browser Supabase client, replace its body with the one-line re-export described in the comment.

## 2. Database (Supabase SQL editor, in this order)
1. Person 1's schema and Person 4's `profiles` table must exist first.
2. Run `supabase/person3_reports.sql`.
3. Create 4+ demo users (Person 4's demo logins), then run `supabase/seed_reports.sql`.
4. Test the demo moment: `select * from run_stall_check();`

### Names I assumed in other people's tables (rename in the SQL/TS if they differ)
| Table | Columns used |
|---|---|
| `projects` | `id`, `title`, `geom` (geometry, SRID 4326), `status`, `start_date`, `updated_at` |
| `profiles` | `id`, `role` (`'citizen'` or `'department'`) |

If `projects.status` is a Postgres enum, add the value `possibly_stalled` (see comment in the SQL).
Person 2's map should colour `possibly_stalled` and show `stall_reason`.

## 3. Environment variables (Vercel + `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only, never NEXT_PUBLIC
GEMINI_API_KEY=                 # server only
GEMINI_MODEL=gemini-2.5-flash   # check Google's current model list and change if needed
CRON_SECRET=                    # any long random string; Vercel sends it to the cron route
```

## 4. How the others plug in
- **Person 2:** on the project page add `<ProjectReports projectId={project.id} />`. Link to `/reports/new?project=<id>`.
- **Person 4:** put `<RunStallCheckButton />` on the department dashboard. For accountability stats use
  `reports.verified_at is not null` as "verified citizen feedback" and `report_events` for the forward/resolve times.
  Departments resolve a report with `supabase.rpc('resolve_report', { p_report_id, p_note })`.

## 5. How it works
| Step | Where | Notes |
|---|---|---|
| Location | `ReportForm` | EXIF from the original photo, else browser location, else map pin. EXIF is read before compression because compression strips it. |
| Location check | `reports_before_insert` trigger | Distance to the project line/polygon. Over 150 m = `flagged`, cannot be verified. Clients cannot override it. |
| Duplicates | same trigger | Same project + category within 50 m and 48 h. Done in SQL, not by AI. |
| Voting | `report_votes` | One vote per user (primary key), no self-votes, tap again to undo. |
| Trust score | `recompute_report()` | Base 2 (EXIF) / 1 (browser) / 0 (pin), +1 per confirm, -1 per dispute. At 4 = Verified, then auto-Forwarded. At -2 = Disputed. |
| Status trail | `report_events` | Submitted, Verified, Forwarded, Resolved. Written by triggers only. |
| Stall check | `run_stall_check()` | (A) planned/ongoing, start date over 7 days ago, no official update in 7 days; (B) 2+ verified abandoned/not-completed reports in 30 days while official status says ongoing/completed. Daily cron + manual button. |
| Photo AI | `/api/reports` + `lib/gemini.ts` | Classified once, stored. Any failure or timeout = `unclassified` and the report still goes through. |
All thresholds live in one SQL function, `report_rules()`.

## 6. Demo script (about 90 seconds)
1. Log in as a citizen, open a project, tap Report a problem, upload a geotagged photo. Show the auto location and the AI label.
2. Try to submit from far away (or use the seeded flagged report): show "wrong location".
3. Log in as a second citizen, confirm the report. Show the trust bar fill and the status change to Sent to department.
4. Open project 3 (official status Ongoing, two verified "abandoned" reports). Log in as a department, tap **Run stall check now**.
   The project flips to Possibly stalled with the reason shown.

## 7. Disclose in the team README
Libraries: `@supabase/supabase-js`, `exifr`, `browser-image-compression`, `react-leaflet`, `leaflet`.
APIs and services: Google Gemini API (photo classification), OpenStreetMap tiles, Supabase (PostgreSQL/PostGIS, Auth, Storage), Vercel.

## 8. Known limits (say them honestly if asked)
- Report photos are in a public bucket so they display without signed URLs; a production version would use signed URLs and face/number-plate blurring.
- A resident could still confirm falsely; trust scoring reduces this but a production version would add reputation and rate limits.
- Vercel's free plan runs crons once a day, so the manual button exists for live demos.
