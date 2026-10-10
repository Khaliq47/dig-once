# DigOnce

**One road, dug once.** A transparency and coordination platform for public works projects.

Built for the 24-hour Web Development Hackathon, IIITDM Kancheepuram (CivicTech track).

- **Live app:**  https://dig-once.vercel.app/
- **Demo video:** https://drive.google.com/file/d/1Du9ztWIUQSoTuTDZnlgmH1ZinfnZ8UCy/view?usp=sharing
- **Team:** WEBNIX
- **Team members:** Krishant (CS25I1053), Sriesh (CS25I1060), Khaliq (CS25B2049), Dakshin (CS25B2048)

## Demo logins (for judges, no setup needed)

Open the live app, go to **Login**, and click one of the one-click buttons:

| Role       | Button                     | Lands on                |
|------------|----------------------------|-------------------------|
| Citizen    | Login as Citizen (demo)    | Find work near me       |
| Department | Login as Department (demo) | Project submission form |

Residents can browse without logging in. The department portal needs a department account.

## The problem

Residents see roads dug up, drains repaired and pipelines laid every day, but have little information about the purpose, timeline or responsible authority. Departments often work without knowing what others have planned, so the same road gets dug several times in a few months. When work stalls or is done badly, there is no simple way to follow up or hold anyone accountable.

## Our solution

DigOnce gives departments, contractors and residents one shared view of public works.

### For departments
- **Live conflict check while submitting a project.** Pick a road and dates, and the form checks other projects within 50 metres before anything is dug. It flags three kinds of conflict:
  - **No-dig period:** the road was recently resurfaced.
  - **Wrong work order:** surface work scheduled before underground work.
  - **Bundle opportunity:** nearby work that could be combined, with estimated days saved.
- **Validation of edge cases:** invalid dates, missing fields, duplicate submissions and projects that touch no road are rejected with clear messages.
- **Manage my projects:** departments see and update their own projects.
- **Stall detection:** a check marks a project as possibly stalled when verified citizen reports disagree with its official status.

### For residents
- **Find work near me:** an interactive map using the browser's location to show nearby work.
- **Reports with proof:** residents submit a photo or complaint about a project. The location is read from the browser or from the photo's EXIF data, and photos are compressed before upload.
- **Confirm or dispute:** other residents vote on a report (one vote per user), and a trust score decides when it counts as Verified.
- **Status trail:** each report moves through Submitted, Verified, Forwarded to department and Resolved, with a timeline.
- **Location picker:** pin the exact spot of an issue on a map.

### For everyone
- **Accountability dashboard:** departments and contractors ranked by on-time rate, average delay, repeat digs and verified citizen reports, shown as charts and a ranked table.

## Tech stack

| Area              | Tools                                                                                              |
|-------------------|----------------------------------------------------------------------------------------------------|
| Framework         | Next.js 16 (App Router, Turbopack), React, TypeScript                                              |
| Styling           | Tailwind CSS                                                                                       |
| Database and auth | Supabase (Postgres, PostGIS, Row Level Security, Supabase Auth)                                    |
| Conflict engine   | Postgres functions that validate a project and find conflicts using PostGIS distance queries       |
| Reports logic     | Postgres triggers and functions for votes, trust score, status trail and stall detection           |
| Analytics         | SQL views read by the dashboard                                                                    |
| Maps              | Leaflet, react-leaflet, OpenStreetMap tiles                                                        |
| Hosting           | Vercel                                                                                             |

## Open-source libraries and APIs used

We disclose everything we used:

- [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (database, auth, PostGIS)
- [Leaflet](https://leafletjs.com) and [react-leaflet](https://react-leaflet.js.org)
- [OpenStreetMap](https://www.openstreetmap.org) map tiles and road data (ODbL licence)
- [exifr](https://github.com/MikeKovarik/exifr) for reading photo location metadata
- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) for compressing photos in the browser
- `ADD ANY OTHERS YOU USED (charts library, Gemini API, Zapier, and so on)`

## Data

All project, report and ranking data in this demo is **simulated** for demonstration. Road geometry comes from OpenStreetMap. The accountability rankings shown on the dashboard use demo values, not live calculations from the projects table.

## Running it locally

**Requirements:** Node.js 20 or newer.

```bash
git clone <your-repo-url>
cd dig-once
npm install
```

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

To check a production build:

```bash
npm run build
```

## Database

The database runs on a hosted Supabase project, so judges can use the live app without any setup. The SQL behind it is in the [`supabase/`](supabase/) folder:

- `supabase/original/` is the first schema, conflict engine and seed data.
- `supabase/person3_reports.sql` and `supabase/seed_reports.sql` add reports, votes, the status trail and stall detection. Details are in [`PERSON3_README.md`](PERSON3_README.md).
- `supabase/04_accountability_views.sql` creates the dashboard views.
- `supabase/05_current_functions.sql` holds the current code of every database function, including the conflict engine.

See `supabase/NOTE.md` for the order and warnings. To rebuild the database yourself, create a Supabase project, enable the PostGIS extension, and run the files in that folder.

## Project structure

```
app/
  login/          Login page with one-click demo buttons
  department/     Project submission form with live conflict check
    manage/       Department project management
  search/         Find work near me (map)
  reports/        Citizen reports and new report form
  dashboard/      Accountability dashboard
components/       Shared UI (navbar, footer, charts, report components)
lib/              Supabase clients and helpers
supabase/         Database scripts
```

## Team contributions

| Area                                                              | Contributor |
|-------------------------------------------------------------------|-------------|
| Database, seed data, conflict engine, department submission form  | Dakshin     |
| Citizen map and search                                            | Krishant    |
| Reports, verification and stall detection                         | Khaliq      |
| Auth, deployment, accountability dashboard                        | Sriesh      |

## Limitations and future work

- Rankings currently use demo values. The next step is calculating them directly from live project data.
- The "Find work near me" map currently shows sample pins and should be connected to the real projects table.
- Planned: notifications for followed areas and AI-generated summaries in Tamil and English.