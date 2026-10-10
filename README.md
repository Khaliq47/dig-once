# DigOnce

**One road, dug once.** A transparency and coordination platform for public works projects.

Built for the 24-hour Web Development Hackathon, IIITDM Kancheepuram (CivicTech track).

- **Live app:** https://dig-once.vercel.app/
- **Demo video:** `demo/demo.mp4` (or the link here: `ADD LINK`)
- **Team:** WEBNIX
- **Team Members:** Krishant(CS25I1053),Sriesh(CS25I1060),Khaliq(CS25B2049),Dakshin(CS25B2048)

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
- **Validation of edge cases:** invalid dates and missing fields are rejected with clear messages.
- **Manage my projects:** departments see and update their own projects.

### For residents
- **Find work near me:** an interactive map using the browser's location to show nearby work.
- **Reports:** residents submit a photo or complaint about a project. The location is read from the browser or from the photo's EXIF data, and photos are compressed before upload.
- **Location picker:** pin the exact spot of an issue on a map.

### For everyone
- **Accountability dashboard:** departments and contractors ranked by on-time rate, average delay, repeat digs and verified citizen reports, shown as charts and a ranked table.

## Tech stack

| Area              | Tools                                                                 |
|-------------------|-----------------------------------------------------------------------|
| Framework         | Next.js 16 (App Router, Turbopack), React, TypeScript                 |
| Styling           | Tailwind CSS                                                          |
| Database and auth | Supabase (Postgres, PostGIS, Row Level Security, Supabase Auth)       |
| Conflict engine   | A Postgres function (`submit_project`) using PostGIS distance queries |
| Analytics         | SQL views read by the dashboard                                       |
| Maps              | Leaflet, react-leaflet, OpenStreetMap tiles                           |
| Hosting           | Vercel                                                                |

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

**Requirements:** Node.js 20 or newer, and a Supabase project.

```bash
git clone `ADD REPO URL`
cd dig-once
npm install
```

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The database lives in a hosted Supabase project, so judges can use the live app without any setup. The SQL we used is in the `supabase/` folder (see `supabase/NOTE.md` for what each file does). Reports, verification and stall detection are described in `PERSON3_README.md`.

Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

To check a production build:

```bash
npm run build
```

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
```

## Team contributions

| Area                                                  | Contributor|
|-------------------------------------------------------|------------|
| Database, seed data, conflict engine, department form | `ADD NAME` |
| Citizen map and search                                | `ADD NAME` |
| Reports and verification                              | `ADD NAME` |
| Auth, deployment, accountability dashboard            | `ADD NAME` |

## Limitations and future work

- Rankings currently use demo values. The next step is calculating them directly from live project data.
- The "Find work near me" map currently shows sample pins and should be connected to the real projects table.
- Planned: notifications for followed areas, stall detection from verified citizen reports, and AI-generated summaries in Tamil and English.


