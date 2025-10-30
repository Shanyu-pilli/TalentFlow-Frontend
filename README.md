<<<<<<< HEAD
# TalentFlow — Frontend

This repository contains the frontend for a demo HR management dashboard built with React, TypeScript and Vite. It is a self-contained, local-friendly simulation that uses Dexie (IndexedDB) as a local datastore and implements candidate/job/assessment workflows and dashboards for prototyping and UI exploration.

The README below documents how to work with the project, run and build it, and explains the main features and architecture so you can continue development or deploy a packaged build.

## Table of contents

- Project overview
- Quick start (local development)
- Scripts (what you can run)
- Architecture & key files
- Data & mock DB (Dexie)
- Features implemented
- Styling and design system
- Linting, types and tests
- Deployment notes
- Troubleshooting & common gotchas
- Contributing

---

## Project overview

This is a single-page React + TypeScript application scaffolded with Vite. It demonstrates a full HR/admin UI including:

- Candidates listing (list, grid, kanban)
- Candidate detail and resume handling
- Jobs listing, reorderable list and job detail
- Assessments: templates, responses and metrics
- Two dashboards (chart-focused and card-focused)
- Small local mock server / seed data plus Dexie-based storage for demo data

The app is built for local development and fast iteration — no backend is required to try the UI.

## Quick start (local development)

Prerequisites
- Node.js (>= 16 recommended) and npm (or pnpm). Install Node using nvm if preferred.

Steps

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open the app in your browser (vite prints the URL, usually http://localhost:5173)
```

Notes
- The app uses Dexie (IndexedDB) for local persistence. Seed data is provided in `src/lib/seed-data.ts` and is automatically used when the mock server / DB initializes.

## Available scripts

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build (output in `dist/`)
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint across the project

## Architecture & key files

- `src/main.tsx` — app entry
- `src/App.tsx` — root app layout and routes
- `src/pages/` — page-level routes (Dashboard, DashboardV2, Candidates, Jobs, Assessments, Profile, etc.)
- `src/components/` — reusable components and UI atoms (including `ui/` primitives)
- `src/lib/db.ts` — Dexie database schema and helpers
- `src/lib/mirage-server.ts` — optional mock server used in demo mode
- `src/lib/seed-data.ts` — demo data used to seed IndexedDB
- `public/` — static assets (favicon, placeholder images)

## Data & mock DB

- The demo persists data to IndexedDB via Dexie. Tables include `jobs`, `candidates`, `assessments`, and `assessmentResponses`.
- Seed data is loaded from `src/lib/seed-data.ts` when the DB is initialized locally.
- The UI issues fetch requests to `/api/...` endpoints in some places; these are serviced by a local in-browser mock server for development.

## Features implemented (high level)

- Candidate workflows: search, filters (stage, job), list/grid/kanban views, bulk stage changes, resume viewing.
- Job workflows: open/close/archive/draft statuses, reorderable job list, job details.
- Assessments: templates, metrics (active vs total), responses and small analytics.
- Dashboards: chart-heavy `Dashboard.tsx` and card-oriented `DashboardV2.tsx` with top metrics and recent items.
- Shared UI primitives: badges, select, dialog, toast, forms (shadcn-ui / Radix primitives + Tailwind)

## Recent changes (Oct 2025)

The developer made several UI and UX improvements to the demo during the October 2025 update. If you're pulling the repo or working locally, expect these features to be present:

- Profile: Logout button — a visible Logout button was added to the `Profile` page. It clears the local demo `profile` table, removes session/local view state, clears some demo notification data, and redirects back to the home page (the app then reloads to present the seeded initial state).
- Profile: Live stats — the top statistics on the `Profile` page now read live counts from the local Dexie DB (jobs, candidates, assessments and recent applicants) instead of hard-coded values.
- Candidates: Job filter fixes — the job filter dropdown now updates the URL and local state correctly. Selecting a job will scope candidate fetches to that job (the mock API supports `?job=<jobId>`).
- Dashboards: Animatic UI — both `Dashboard.tsx` and `DashboardV2.tsx` received entrance/hover animations and animated numeric counters for a more dynamic feel. A small `AnimatedNumber` component (in `src/components/AnimatedNumber.tsx`) animates numeric counters using `framer-motion`.
- Small UX tweaks: subtle list entrance staggering, card hover scale, and improved stage/job badges were added across the app for a smoother polish.

Notes about behaviour
- Logout is demo-only (there's no backend auth) — it clears local/demo state to simulate signing out. If you want a modal confirmation instead of a `window.confirm`, the code can be swapped to use the app's `Dialog` primitive.
- Animations respect the user's motion preferences in future iterations (currently lightweight by default). If you need strict reduced-motion support, I can add a media-query check and disable/soften animations.


## Styling and design system

- Tailwind CSS with utility classes. Components are based on shadcn/ui primitives (Radix + Tailwind patterns).
- Icons provided by `lucide-react`.

## Linting, types and tests

- Type checking: TypeScript (`npx tsc --noEmit`)
- Linting: ESLint (`npm run lint`)
- There are no automated tests in this demo; adding unit tests (Vitest / React Testing Library) is recommended before productionizing.

## Deployment notes

- Build: `npm run build` produces static assets in `dist/` suitable for a static host (Netlify, Vercel, GitHub Pages, S3 + CloudFront, etc.).
- If you want a dynamic backend, the Dexie mock should be replaced with real API endpoints and server-side storage.

## Troubleshooting & common gotchas

- If the editor shows a red marker on a file:
	- Save the file, restart the TypeScript server in VS Code (Command Palette → "TypeScript: Restart TS Server") or reload the window.
- If you see mismatched numbers (e.g., "Active Jobs" vs "Total Jobs"), the app distinguishes between counts in different ways:
	- "Openings (active)" sums openings across active job postings (this can be larger than the job count).
	- "Total Jobs" is the number of job postings.
- IndexedDB is per-origin. If you switch ports or hosts, the seeded data may not show up until the DB is re-initialized (clear site storage or run the seed script in `src/lib/seed-data.ts`).

## Contributing

- Fork the repo, create a feature branch, run the app locally and open a PR when ready. Keep changes small and focused.
- Before opening a PR, run `npm run lint` and ensure TypeScript passes.

## Next steps / suggestions

- Add E2E or component tests (Vitest + Testing Library)
- Add a basic auth flow and server-backed API for persistence
- Improve accessibility (a11y) checks and automated CI
- Centralize color tokens and theme variables for consistent styling

---

If you want, I can: generate a more detailed developer guide (file-by-file), add CI scripts for lint/type-check/build, or create deployment instructions for a specific host (Vercel, Netlify, or Azure). Tell me which one you prefer and I'll implement it.
=======
# TalentFlow---Next-Gen-Hiring-Dashboard
Modern hiring management platform with analytics, candidate tracking, and assessment tools

Live-vecel:https://talent-flow-blue.vercel.app/
========
Live-Netlify:https://talent-flow-dashboard.netlify.app/

>>>>>>> 
