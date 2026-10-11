# Audit: Andropedia recruitment site

Scope: the recruitment flow (`/join`, `POST /api/recruitment`, Google Sheet delivery, confirmation email), the emailed-code login, and the shared plumbing around them. Impact is **high**, **medium** or **low**. `[x]` means fixed on branch `feat/recruitment-polish`; `[ ]` means still open (see the notes).

Baseline before this branch: `next build` passes; `eslint` reported 3 errors and 27 warnings; there were no tests.
Now: build passes, `eslint` reports 0 errors and 13 warnings, 85 tests pass.

## Bugs
- [x] high: A transient Google Sheets error (timeout, 429, 5xx) failed the application immediately. Now retried with backoff, 10 s timeouts, and a retry first checks the reference so it never writes a row twice.
- [x] high: Nothing was saved anywhere else when the Sheet was unreachable. Now a durable Postgres outbox keeps the application, and `flushOutbox` copies it to the Sheet later.
- [x] medium: The confirmation email was sent inside the request. Now sent after the response (`after()`), and queued applications are emailed too.
- [x] medium: Gmail dots and `+tag` aliases bypassed the one-application-per-email rule. Now normalised for duplicate detection (the sheet check, the outbox and the unique constraint).
- [x] medium: Empty Sheet tab got no header row. The header row is now written automatically.
- [x] low: The honeypot returned a fixed fake reference. Now a random reference.
- [x] low: Lint errors in `domains/page.tsx` and `ParticleHeroCanvas.tsx`.
- [ ] low: Duplicate check plus append is still not atomic across several server instances. Two submissions for the same email landing on different instances in the same instant could both pass (the outbox path is protected by a unique constraint; the Sheet path is not). The dashboard should treat the earliest row per email as the real one.

## Security
- [x] high: Security headers added (`nosniff`, framing blocked, referrer policy, permissions policy, a safe CSP subset, HSTS in production); `X-Powered-By` removed.
- [x] high: Request bodies now have size limits (16 KB to 32 KB) and return 413.
- [ ] medium: Rate limits are still in memory per server instance. Added `Retry-After` and an `x-real-ip` fallback, but a durable limiter (database or Redis) is the real fix on serverless hosting. Login codes are already limited per email in the database.
- [x] medium: Client IP now falls back to `x-real-ip`.
- [x] medium: Environment is validated centrally (`src/lib/env.ts`); problems are reported by `/api/health` (detailed list only with the bearer secret).
- [x] medium: Query parameters on `/api/tasks` and `/api/leaderboard` are validated.
- [ ] low: `/api/member-photo/[id]` has no rate limit.

## Validation and error handling
- [x] high: Open/close and a deadline are enforced on the server (`RECRUITMENT_OPEN`, `RECRUITMENT_OPENS_AT`, `RECRUITMENT_CLOSES_AT`) and shown in the form.
- [x] medium: Raw zod messages no longer leak ("This field is required." instead).
- [x] medium: API errors share one shape (`{ success: false, error, fieldErrors? }`) in the recruitment, login, leaderboard, weeks, members and body-reading paths.
- [x] medium: Added a 404 page and a route error boundary.
- [x] low: Structured logger (JSON in production, no emails or answers in logs) used by the recruitment and login routes and the outbox.
- [ ] low: A few older routes still use plain `console.error`.

## Accessibility
- [x] high: Join form has `aria-invalid`, `aria-describedby`, `aria-required`; focus moves to the step heading and to the first invalid field; fieldset/legend for the domain choice; step labels for screen readers.
- [x] medium: Visible focus rings (global rule plus on form controls).
- [x] medium: Helper text on `/join` raised to a higher-contrast colour. A full-site contrast audit was not done.
- [x] low: `prefers-reduced-motion` honoured for CSS (global rule) and for framer-motion (`MotionConfig reducedMotion="user"`).

## Performance
- [x] medium: `/join` is a server component; only the form is a client component. The FAQ uses native `<details>`.
- [ ] medium: Avatars are still raw `<img>` (now `loading="lazy"` and `decoding="async"`). Moving to `next/image` needs the remote hosts (Google Drive proxy, Unsplash demo images) configured.
- [x] medium: The home page embedded the full Domains, Team, Projects and Events pages (about 9,600 px for the team alone, loaded up front). It is now a short overview (about 4,700 px) with a core-team preview and links to the real pages; the navbar and footer link to those pages.
- [x] low: Cache headers on `/api/members`, `/api/weeks`, `/api/leaderboard` and `/api/recruitment/status`.
- [x] low: Removed 16 unused imports/variables and a wasted `/api/tasks` request on the admin page.

## UX/UI polish
- [x] high: Autosave of the in-progress application (localStorage, 14 days, never saves consent, "Start over").
- [x] medium: Deadline banner with days left, and an "applications closed / open soon" panel.
- [x] medium: Toasts for draft restored, reference copied and connection problems.
- [x] low: Copy button for the reference ID on the confirmation screen.
- [x] low: Mobile-first form: 16 px inputs, full-width buttons, stacked controls on small screens. Checked in code; not checked on a real phone-width browser window.

## Missing features for a recruitment site
- [x] high: Open/close dates and a kill switch, enforced on the server.
- [x] high: Outbox so an accepted application is never lost, with a script and a protected endpoint to flush it (no `vercel.json` cron: hobby plans only allow daily crons).
- [x] medium: Sheet header row created automatically.
- [x] medium: Optional allow-list of email domains.
- [x] medium: `/api/health`.
- [x] medium: SEO: per-page metadata for `/join`, `metadataBase`, title template, Open Graph and Twitter tags with a generated share image, `sitemap.xml`, `robots.txt`, private portal marked noindex.
- [ ] medium: Applicants cannot look up the status of an application. This needs applicant accounts or a reference-plus-email lookup against the Sheet, and was deliberately left out (the admins' dashboard owns status).

## Tests
- [x] high: 85 tests (`npm test`): validation, deadline rules, email normalisation, rate limiter, sheet row building and formula injection, retries, http helpers, env checks, the full application route (success, duplicates, simultaneous submissions, validation, honeypot, rate limit, allow-list, closed and not-yet-open, outbox fallback, total failure) and the outbox flush.
- [ ] medium: No component tests for the form (would need jsdom and testing-library). The form was exercised by hand in a real browser instead.
- [ ] medium: Google Sheets and SMTP calls are tested through fakes only. They have never run against a real sheet or mail provider.

## Update (2026-10-09)
- The recruitment outbox was removed. `Application` rows are the source of truth; `npm run recruitment:retry` re-syncs rows with no Sheet copy or no confirmation email.
- Rate limits are now shared through Postgres (`RateLimit`), falling back to memory if the database is down. This closes the "in memory per instance" item above.
- Added: applicant status lookup, admin applicant review with decision emails, `Project` model and API (the `/projects` page no longer ships invented projects), real home-page leaderboard, graded-task emails, add-member and create-week forms, audit log viewer.
- Tests now cover login codes, sessions, the role guard, task submission, grading and every admin route.
- Still open: the new migrations (`drop_recruitment_outbox`, `rate_limit`, `projects`) have not been applied to the live database, and mail and the Sheet have not been checked end to end against the real services.

## Pre-production audit (2026-10-11)

A senior-QA / DevOps pass over the site, database, API and connectivity. Fixed in this release unless marked open.

- [x] critical: The member sheet was readable by anyone and its id was hard-coded in the (public) repository. The id is now configuration (`MEMBER_SHEET_ID`), the sheet is read through the service account with the read-only scope and only the columns the app needs, and the public read is off unless `MEMBER_SHEET_ALLOW_PUBLIC=true` (reported by `/api/health`). **Open, manual:** set the sheet to Restricted and treat the data as exposed (docs/GO_LIVE.md).
- [x] critical: A new member's password was their register number and nothing made them change it. Accounts on the default password are now flagged (`mustChangePassword`, set by a migration for existing ones); the server refuses everything but the password change until it is changed, the portal redirects to it, and the register number is not accepted as the new password. No email or code is involved.
- [x] high: Next.js 16.3.6 advisories: upgraded to 16.4.0; `mysql2` and `deepmerge-ts` overridden to patched versions; vitest 5. `npm audit --omit=dev` reports 0. Only dev tooling (eslint-config-next, tailwindcss) still has advisories; CI fails on any high advisory in production dependencies.
- [x] high: Migrations were not applied. Applied locally; `/api/health` now reports missing tables or columns; docs/GO_LIVE.md puts `db:deploy` before the deploy; `prisma.config.ts` falls back to `DATABASE_URL` when `DIRECT_URL` is unset.
- [x] high: Supabase connection: pool size, idle and connect timeouts and a statement timeout in `lib/prisma.ts`; `/api/health` flags the direct (port 5432) URL used as `DATABASE_URL`; the `.env.example` advice that only applied to Prisma's old engine was replaced.
- [x] high: Production configuration checks: missing or localhost `NEXT_PUBLIC_SITE_URL`, missing `DIRECT_URL`, `MEMBER_SHEET_*`. Password-reset links now fall back to the Vercel production URL.
- [x] high: Rate limits trusted the first `X-Forwarded-For` entry, which a visitor can forge. They now use the platform header, then the entry the closest trusted proxy added (`TRUSTED_PROXY_HOPS`).
- [x] high: Anyone could lock any member out by failing 20 logins. Limits are now per address, per address+account, and per account counting only failures, and an address that has signed in to that account before is not blocked by the account-wide counter.
- [x] high: Fetches without timeouts (Drive photo proxy, browser auth calls, the member sheet). All have timeouts now.
- [x] medium: Public image routes: malformed ids answer 404 without a query, a rate limit, and a missing table reads as "no photo". Uploads stop reading at the size limit even without a `Content-Length`.
- [x] medium: Forgot-password answered faster for unknown accounts than for real ones. The work now happens after the response.
- [x] medium: `/hero-preview` removed. Extra CSP directives (`connect-src`, `frame-src`, `worker-src`, `manifest-src`) and `Cross-Origin-Opener-Policy` added.
- [x] medium: Daily cleanup (`vercel.json`) also removes expired password-reset links and keeps "known address" markers for 31 days.
- [x] medium: Join-form drafts last 3 days (was 14) and no longer keep the phone number.
- [x] low: The three.js globe is loaded lazily, off the critical path of the first paint. Portal pages have an `<h1>` while loading. Lint warnings cut from 21 to 11, `console.*` in server code moved to the logger, stale README parts fixed.
- [x] tests: 311 -> 339 (client IP, bounded body, login limiter, forced password change, forgot-password timing, image routes, sheet reader, production env checks, schema check). CI now also runs `prisma validate`, `npm audit` and `next build`.
- [ ] open: photos are stored in Postgres (move to object storage if the database grows).
- [ ] open: no `script-src` in the CSP (needs nonces); no end-to-end tests; mail, Sheets and the webhook have only run against fakes.
- [ ] open: accounts that have not changed their default password can be taken over by anyone who knows the register number (see docs/GO_LIVE.md, section 6).
