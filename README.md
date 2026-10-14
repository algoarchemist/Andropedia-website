# Andropedia: Official Student Technology Club Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-13-purple?style=flat)](https://www.framer.com/motion/)

> **Pioneering Technology. Building Creators.**
> The website, recruitment platform and weekly sprint evaluation portal of the **Andropedia** student technology club.

**Contents:** [Architecture](#architecture) · [Domains](#domains) · [Features](#features) · [Getting started](#getting-started) · [Scripts](#scripts) · [Configuration](#configuration) · [Logging in and accounts](#logging-in-and-accounts) · [Database](#database-supabase-postgres--prisma) · [Running the club](#running-the-club-admin) · [Recruitment](#running-recruitment) · [Deploying](#deploying) · [Security](#security) · [Testing and CI](#testing-and-ci) · [Project layout](#project-layout) · [Troubleshooting](#troubleshooting) · [Contributing](#contributing)

---

## Architecture

- **One Next.js App Router app** (React 19, TypeScript): the public site and the `/api/...` routes live in one repository and deploy together to Vercel or any Node host.
- **Postgres through Prisma** (Supabase in production): members, sprint weeks and tasks, evaluations, applications, events and their photos, projects, sessions, an audit log and the shared rate-limit counters. Schema and migrations are in `prisma/`.
- **Server-side everything that matters:** sessions are HTTP-only cookies, every protected API route checks the session and role, and input is validated with zod on the server.
- **Scroll storytelling:** pinned, scroll-driven sections (hero, domain wheel, recruitment train) on desktop, with plain static layouts on phones and for visitors who prefer reduced motion.
- **No media files for sound:** interface sounds are synthesised in the browser with the Web Audio API.

## Domains

Five domains are open to applicants, in this order: **Technical**, **Web Development**, **Design**, **Media**, **PR**. The home page's domain wheel shows all six: Technical, Web Development, Design, Media, **R&D**, then PR last. Each of the five is one vertex of the Andropedia logo.

**R&D / AI Labs** is not applied to directly: members join one of the five domains and are moved to R&D later, so R&D stays in the member list, team page and portal, and is shown on the home page's domain wheel (new concepts, fresh ideas for the club, growth and event organisation) but not in recruitment or the public domain pages.

---

## Features

### Public site

- **Landing page (`/`)**: a human hand and a robot arm touch at the fingertips; scrolling parts them and reveals the ANDROPEDIA headline. It continues into pinned storytelling, including a **domain wheel** where the logo is the progress bar (it lights from grey to blue through the six domains and shines at the end), the sprint snapshot, event highlights, and a honeycomb of the team.
- **Navigation**: no bar. The wordmark goes home, **Recruitment** (top right) goes to the train on `/join`, and a handle at the top centre drops a **half rotary dial**: press a numbered hole, pull it round to the stop and let go to dial a page. Plain links under the dial cover keyboards and screen readers.
- **Team (`/team`)**: core council, leads, co-leads and members with role badges. Clicking a card opens the member's profile.
- **Projects (`/projects`)**: project cards with tech tags, demos and source links (managed by admins).
- **Events (`/events`)**: **Upcoming** events, and **The Archive** of past ones with photo carousels. An event whose date is not announced yet shows "Date to be announced": if its placeholder start is still in the future it is listed under Upcoming as **Coming Soon** (nobody can register); if the placeholder is in the past it goes to the Archive. Admins manage events and upload photos in the portal.
- **Recruitment (`/join`)**: "Who can apply", then the **recruitment train** (a scroll-driven ride through the five selection steps), then the **pin-board application**: a gamified questionnaire in five levels (Basics, Vibe check, Choose domain, Domain round, Review). Answers are autosaved on the device for 3 days (never the consent tick or the phone number), applicants get a reference ID, and can check their status later with reference ID plus email.
- **Legal**: `/privacy` and `/terms`.

### Sound

Sounds (rotary dial, domain wheel progress, hexagon tiles, member and event cards, the recruitment train, the pin-board form) are generated with the Web Audio API. Browsers only start audio after a click, tap or key press, so each page with sound has a **Sound on / off** button that shows the real state (it pulses "Click for sound" while locked). The choice is remembered and applies site-wide. Nothing plays for visitors who have muted it.

### Error pages and connectivity

- **404** page with the mascot for addresses that match no page.
- **Offline / dropped connection** and **server error** screens (`error.tsx`) are told apart by `lib/error-kind.ts`. When the cause is the connection, the page reloads by itself as soon as the browser is back online. `global-error.tsx` is the last-resort fallback if the root layout fails.
- A small **"You're offline / Back online"** pill appears on every page when the connection drops.

### Member and admin portal

- **Login** with the register number (see [Logging in](#logging-in-and-accounts)). Members still on their default password must choose a new one before the portal does anything else.
- **Dashboard (`/portal/dashboard`)**: score radar, active sprint, streak, recent feedback.
- **Task submission (`/portal/submit-task`)**: repositories, live demo URLs, Figma files and notes, one submission per member per open week, editable until graded.
- **Evaluation queue (`/portal/evaluations`)**: domain leads score deliverables on a four-part rubric (0-100) and leave feedback.
- **Leaderboard (`/portal/leaderboard`)**: podium, filters by domain and period (all-time, current week, monthly), rank changes and streaks.
- **Account (`/portal/account`)**: change your password with your current one. No email or code is needed.
- **Admin console (`/portal/admin`, super admins only)**: sprint weeks, members (create, edit, profile photo upload, roles, positions, active status), events and reservations (with photo upload), projects, recruitment applicants, and the audit log.

---

## Getting started

### Prerequisites
- Node.js **20.9 or newer** (22 recommended; CI uses 22) and npm
- A Postgres database (Supabase, or a local one)

### Install and run
```bash
git clone https://github.com/andropediarmp-a11y/Andropedia-website.git
cd Andropedia-website
npm install
cp .env.example .env     # fill in the values (ask a maintainer; never commit .env)
npm run db:deploy        # create the tables
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

After pulling changes that touch `prisma/schema.prisma`, run `npm run db:deploy` and **restart `npm run dev`**: a running dev server keeps the old Prisma client in memory.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm test` | Vitest (unit and route tests) |
| `npm run lint` | ESLint |
| `npm run db:deploy` | Apply pending migrations (uses `DIRECT_URL`) |
| `npm run db:migrate` | Create and apply a migration during development |
| `npm run db:seed` | Demo data for local development only (refuses a non-local database unless `ALLOW_DEMO_SEED=1`) |
| `npm run db:import-members` | Copy members from the club's private Google Form sheet into the database; syncs LinkedIn links; safe to re-run |
| `npm run db:cleanup` | Remove expired sessions, reset links and old rate-limit counters (also `GET /api/cron/maintenance`) |
| `npm run events:club` | Add the club's archive and upcoming events and set the archive order |
| `npm run user:set-role -- <email> <role> [domain] ["Name"]` | Create or change an account's portal role (`member`, `domain_admin`, `super_admin`) |
| `npm run user:deactivate -- <email>` | Switch an account off and sign it out |
| `npm run user:set-register-no -- <email> <register no> [password]` | Give an account a login; it must choose a new password at the first sign-in |
| `npm run team:set-position -- <email> <position> [domain]` | Team position (president, vice_president, chief, lead, co_lead, member) |
| `npm run team:import-positions -- <file.csv>` | The same in bulk (see `docs/team-positions.example.csv`) |
| `npm run recruitment:retry` | Re-send missing Sheet rows and confirmation emails |

`NEXT_DIST_DIR=.next-build npm run build` builds into another folder, so a build never disturbs a running dev server.

---

## Configuration

Copy `.env.example` to `.env`. The important variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Runtime database connection. In production on serverless hosting use the Supabase **pooler** (port 6543, `?sslmode=require`) |
| `DIRECT_URL` | Direct database connection (port 5432), used only by migrations |
| `PG_POOL_MAX` | Connections per server instance (default 5 in production) |
| `AUTH_SECRET` | **Required in production.** Mixed into every password hash; changing it later invalidates all passwords |
| `NEXT_PUBLIC_SITE_URL` | Public URL: password-reset links, sitemap, share previews |
| `CRON_SECRET` | Protects `/api/cron/*` and unlocks the detailed `/api/health` |
| `MEMBER_SHEET_ID`, `MEMBER_SHEET_GID` | The private Google Form responses sheet that holds new members |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `RECRUITMENT_SHEET_ID` | Service account and the applications sheet |
| `RECRUITMENT_SHEET_WEBHOOK_URL`, `RECRUITMENT_SHEET_WEBHOOK_SECRET` | Simpler alternative: an Apps Script web app bound to the sheet (`docs/apps-script-sheet-webhook.gs`) |
| `SMTP_*`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Confirmation emails, decision emails and password-reset links |
| `RECRUITMENT_OPEN`, `RECRUITMENT_OPENS_AT`, `RECRUITMENT_CLOSES_AT` | Recruitment kill switch and schedule |
| `TRUSTED_PROXY_HOPS` | Proxies in front of the app (default 1); rate limits use the address the closest trusted proxy saw |
| `MEMBER_SHEET_ALLOW_PUBLIC` | Local testing only: read the member sheet without credentials. Keep `false` |

`GET /api/health` reports configuration and database problems (missing migrations, localhost site URL, direct database URL, and more). Without the `CRON_SECRET` bearer token it only says `ok` or `degraded`.

---

## Logging in and accounts

Members log in with their **register number**. The username and the **starting** password are both the register number (case and spaces ignored). Passwords are stored as salted scrypt hashes mixed with `AUTH_SECRET`.

- **First sign-in:** an account still on its default password is flagged (`mustChangePassword`). The server refuses everything except the password change until it is done, and the portal sends the member straight to `/portal/account`. Entering the current password (the register number) and a new one of at least 8 characters is all it takes. The register number is not accepted as the new password, and other devices are signed out. **No email or code is involved.**
- **Forgot password** (`/portal/forgot-password`) emails a single-use link valid for 30 minutes to the address on the account. It needs SMTP and is only for members who lost their password.
- **Limits:** 30 attempts an hour per address, 10 per address and account, and 50 *failed* attempts an hour per account (an address that has signed in to that account before is not blocked by the account-wide counter, so strangers can't lock the real owner out). Every failure gets the same message.
- **Sessions:** 14 days, at most 10 per member, signed out everywhere on deactivation or a password change.

Setting people up:

- **Local development:** `npm run db:seed` creates demo accounts without a register number; give one a login with `npm run user:set-register-no -- <email> <register number>`.
- **Real members:** make the form-responses sheet **private**, share it with the service account, set `MEMBER_SHEET_ID` (and `MEMBER_SHEET_GID`), then run `npm run db:import-members`. It never changes an existing role or a password that was already set.
- **First super admin:** `npm run user:set-role -- you@example.com super_admin Technical "Your Name"`, then `npm run user:set-register-no -- you@example.com <register number> [a stronger password]`.
- **Our Team page:** each member has a team position. Everyone imported starts as Member in their domain; set positions with `team:set-position` or in the admin console. Positions don't change portal permissions: use `user:set-role` to give a Lead the `domain_admin` role.

---

## Database (Supabase Postgres + Prisma)

1. Create a Supabase project and copy `.env.example` to `.env`.
2. Fill `DATABASE_URL` (the **Transaction pooler**) and `DIRECT_URL` (the direct connection) from Supabase -> Connect, both with `?sslmode=require`.
3. Create the tables and the first accounts:
   ```bash
   npm run db:deploy          # applies prisma/migrations
   npm run db:import-members  # real members from the private Google Sheet (safe to re-run)
   npm run user:set-role -- you@college.edu super_admin Technical "Your Name"
   ```
4. For schema changes during development use `npm run db:migrate`.

**Always run migrations before deploying the code that needs them.** `/api/health` lists any table or column the code expects that is missing.

**Photos** (member profile pictures and event photos) are shrunk in the browser, checked on the server (JPEG, PNG or WebP only, real file type sniffed) and stored in Postgres. They are cached for a year by the CDN.

**Supabase security:** every table has Row Level Security enabled with no policies. Supabase exposes the `public` schema through a public Data API; with RLS on and no policies that API can read and write nothing. The app talks to Postgres directly through Prisma as the table owner, which bypasses RLS, so it keeps working. Do not add policies or disable RLS.

---

## Running the club (admin)

Super admins manage the club from **Portal -> Admin**, or through the API:

- **Sprint weeks:** open or close a week (only one is open at a time). Members submit to the open week only, one submission each. API: `GET/POST /api/admin/weeks`, `PATCH /api/admin/weeks/:id`.
- **Members:** create a member, edit name, email, register number, domain, position, role, LinkedIn and bio, upload or remove a profile photo, switch someone off. You can't demote or deactivate yourself, and the last super admin can't be removed. API: `/api/admin/members`, `/api/admin/members/:id`, `/api/admin/members/:id/photo`.
- **Events and reservations:** create and edit events, mark the date as not announced, upload up to 20 photos per event, see and export registrations. API: `/api/admin/events...`.
- **Projects:** the cards shown on `/projects`. API: `/api/admin/projects...`.
- **Audit log:** every grade, week, member and event change is recorded. API: `GET /api/admin/audit`.
- **Leaderboard:** computed from graded evaluations only; "weekly" is the open week, "monthly" the last 30 days; rank change compares with the standings before the latest graded week.

## Running recruitment

- **Open / close:** `RECRUITMENT_OPEN=false` closes it immediately; `RECRUITMENT_OPENS_AT` / `RECRUITMENT_CLOSES_AT` (ISO dates with a timezone, e.g. `2026-10-20T23:59:00+05:30`) schedule it. The server enforces this on every submission and `/join` shows the deadline or a closed message. Redeploy after changing environment variables.
- **Where applications go:** the database (`Application` table) is the source of truth. The Google Sheet is a mirror written right after the applicant gets their reference ID. If the Sheet or the confirmation email fails, `npm run recruitment:retry` (or `GET /api/cron/recruitment-flush` with `Authorization: Bearer $CRON_SECRET` from a scheduler every 15 minutes or so) copies the missing rows and re-sends the missing emails.
- **Reviewing applicants:** Portal -> Admin -> Recruitment applicants: filter, read the answers, set the status (new, shortlisted, accepted, rejected), optionally email the decision, export CSV. API: `GET /api/admin/applications`, `PATCH /api/admin/applications/:id`.
- **Applicant status:** applicants use their reference ID and email on `/join` (`POST /api/recruitment/lookup`, rate-limited).
- **Rate limits** are counted in the database (`RateLimit` table) so they hold across server instances, with an in-memory fallback if the database is unreachable.

---

## Deploying

The full production checklist is in **[docs/GO_LIVE.md](docs/GO_LIVE.md)**. In short:

1. Make the member Google Sheet **private** and share it only with the service account.
2. Set the environment variables on the host (pooler `DATABASE_URL`, direct `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `MEMBER_SHEET_ID`, mail and Sheets values).
3. Run `npm run db:deploy` against the production database **before** the new code goes live.
4. Deploy (on Vercel: import the repo; `vercel.json` schedules the daily maintenance job; elsewhere call `/api/cron/maintenance` daily with the bearer token).
5. Check `GET /api/health` with the `CRON_SECRET` bearer token: you want `"status":"ok"` and no problems.

---

## Security

- Every protected route calls `requireUser` (role-checked, cross-site writes refused, default-password accounts held at the password change). Admin routes are super-admin only.
- Request bodies have size limits and are read in a bounded way; uploads are limited to 400 KB (member photos) and 900 KB (event photos).
- Rate limits on login, password reset, registrations, application lookup and public images, keyed by the address the closest trusted proxy saw.
- Security headers: `nosniff`, framing blocked, referrer and permissions policies, HSTS in production, a Content-Security-Policy subset (no `script-src`; that needs nonces), cross-origin opener policy.
- Row Level Security on every table; sessions and reset tokens are stored hashed; secrets live only in the environment.
- `npm audit --omit=dev` must report nothing high; CI enforces it. Dev-only tooling advisories are tracked in `AUDIT.md`.

The audit history and open items are in [AUDIT.md](AUDIT.md).

---

## Testing and CI

`npm test` runs about 340 tests: validation, deadline rules, duplicate detection, sheet retries, the application route, retry sync, logins and sessions, the forced password change, the login limiter, client-IP handling, role checks on every admin route, grading, projects, events and photos, error classification, environment and schema checks. CI (`.github/workflows/ci.yml`) runs `prisma validate`, `tsc`, `eslint`, the tests, `npm audit`, and a production `next build`.

Before opening a PR run `npx tsc --noEmit`, `npm run lint` and `npm test`. There are no browser-level (end-to-end) tests yet.

---

## Project layout

```
src/app/          routes: pages, /api/*, not-found, error, global-error
src/components/   home, team, events, recruitment (train + pin board), portal, layout, ui, design
src/lib/          auth, data-store, events, rate limits, mailer, sheets, env, sound modules (*-sound.ts), ...
src/content/      copy and static content (home, accents, recruitment, leadership)
prisma/           schema, migrations, demo seed
scripts/          admin and maintenance scripts (see Scripts)
tests/            Vitest suites
docs/             GO_LIVE.md, backend PRD, sheet headers and Apps Script
```

---

## Troubleshooting

- **A page is blank or says "Failed to load chunk" after a build or switching branches:** hard-refresh (Ctrl+Shift+R). If it persists, stop `npm run dev`, delete the `.next` folder and start it again.
- **"Column ... does not exist" or photo uploads fail:** migrations are missing. Run `npm run db:deploy`, then restart the dev server.
- **A new Prisma field is `undefined` in the app:** run `npm install` (or `npx prisma generate`) and restart the dev server.
- **No sound:** click anywhere on the page once (browsers block audio until then) and check the "Sound on / off" button.
- **`db:import-members` says the member sheet is not configured:** set `MEMBER_SHEET_ID` and the service-account variables, and share the sheet with that account.
- **`/api/health` says `degraded`:** call it with the `CRON_SECRET` bearer token to see the list.

---

## Contributing

- `main` is the official, deployable branch. Don't push to it directly.
- Make a branch per piece of work (for example `yourname/pr-page`), commit small and clear, push it and open a **pull request** into `main`. A maintainer reviews and merges. Pull the latest `main` before you branch.
- Secrets (`.env`, database URLs, `AUTH_SECRET`) are shared privately and never go in git. Prefer your own database or a Supabase branch over the live one.
- Write access to the repository is granted by a maintainer under Settings -> Collaborators.
- This Next.js version has breaking changes from older ones: read the relevant guide in `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).

---

## License

Crafted with pride by the **Andropedia Technology Council**. All rights reserved.
