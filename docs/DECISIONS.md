# Decisions

One line per decision the PRD was silent on.

- Phase 1: PRD moved from repo root to `docs/PRD.md` to match PRD section 13 and CLAUDE.md.
- Phase 1: `shared/` is consumed as TypeScript source (`main: ./index.ts`); no build step. Client uses Vite, server uses tsx.
- Phase 1: Only phase 1 dependencies installed. react-router, react-hook-form, motion (client) and prisma, multer, sharp (server) arrive with the phase that uses them.
- Phase 1: Tailwind pinned to v3 because DSN-06 specifies `tailwind.config.ts` theme overrides; zod pinned to v3.
- Phase 1: `phone` in `youSchema` accepts 10 digits or `+91` prefixed and outputs `+91XXXXXXXXXX`, so parsed output equals the PRD 8.2 payload; the transform is idempotent.
- Phase 1: Step schemas carry their own cross-field rule (`domainSchema` pref2 differs, `usSchema` otherClubs required); `applicationSchema` repeats both on the merged shape.
- Phase 1: Long text answers use `longTextMin`/`longTextMax` from LIMITS; `rememberUs` is capped by word count (30) instead of the long text min.
- Phase 1: `scripts/check-design.sh` extends the PRD pattern with pill patterns (`rounded-[`, `pill`, per-corner `rounded-t-full`), `conic-gradient`, `glassmorphism`, `bento`, and any `border-radius` above 4px; it scans `client/src` and `client/index.html`, sets `LC_ALL=C.UTF-8` so `grep -P` works on Git Bash, and exits 2 if grep itself fails.
- Phase 1: Root `dev` script uses `concurrently` because `&` is not parallel on Windows cmd.
