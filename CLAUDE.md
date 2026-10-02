# Andropedia Recruitment Website: Agent Rules

This file is always in context. Keep it short. The full spec is `docs/PRD.md`. Never load all of it at once: open the sections your current build phase lists in PRD section 14, and nothing else.

## What we are building
A mobile-first recruitment website for the Andropedia club. A landing page sells the club (what we do, six domains, recruitment process). A six-screen application collects one validated application per student, with a game-like five-stage progress bar. A success screen sends every applicant to the WhatsApp community for domain challenges.

## Stack
- `client/`: React 18, Vite, TypeScript, React Router, react-hook-form, zod, Tailwind (locked theme, PRD 10.6), Motion.
- `server/`: Express, TypeScript, Prisma, PostgreSQL, multer, sharp.
- `shared/`: `constants.ts`, `copy.ts`, `schema.ts`. Single source of truth, imported by client and server.

## How to work
1. Every task maps to requirement IDs (`LND-04`, `APP-03`, `DSN-07`). Cite IDs in commit messages. Never renumber IDs.
2. User-facing text comes only from `shared/copy.ts` (PRD section 9). Do not paraphrase it. New text goes into `copy.ts` first, tagged `// added`.
3. Enums, limits and regexes come only from `shared/constants.ts` (PRD section 8). No magic numbers in components or routes.
4. Validation lives in `shared/schema.ts` and runs on both client and server. The server never trusts the client.
5. Items tagged `(added)` in the PRD were not in the original brief. Untagged items are from the brief and must not be dropped, merged away or weakened.
6. If the PRD is silent, make the smallest sensible choice and log it as one line in `docs/DECISIONS.md`.
7. After every phase run `npm run typecheck && npm run lint && npm run check:design && npm test`. A phase is not done until all pass.

## Design bans (enforced by `npm run check:design`)
Neon purple gradients, glowing text, matrix rain, circuit backgrounds, 3D robots, blurred drop shadows, glassmorphism, bento grids, three feature cards in a row, monospace as a default font, and anything pill shaped: buttons, badges, navigation, inputs, tags, cards. Max border radius is 4px. No gradients at all.

## Design musts
Strong flat colors, expressive typography, slightly imperfect layouts (never on inputs), one theme on every page. Build and test at 360px wide on Android Chrome and iOS Safari first, desktop second.

## Do not
- Add auth, accounts, dashboards or features not in the PRD.
- Use browser storage for anything except the application draft (`SHL-04`).
- Put the photo file in the draft. Store only `photoId` and `url`.
- Use fixed-position bottom bars on form steps. The mobile keyboard covers them.
