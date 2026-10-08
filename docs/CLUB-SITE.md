# Club website (branch `club-website`)

Owner request, 2026-10-03: grow the recruitment site into the full Andropedia club website, on its own branch so `master` stays the recruitment site. Same stack, same design system (PRD section 10: flat color, display type, color bands, no gradients, no pills, radius at most 4px). Structure was inspired by a fellow club's site; its design language is not copied. Content comes from the club's former site (andropedia.vercel.app) and the owner. Nothing is invented: where content is missing, the page shows an empty state.

## Navigation ribbon

Home | Events | Our team | Projects | Blog | Androlink | Join us

One header on every club page: the wordmark, then the ribbon. On phones the ribbon scrolls sideways inside itself (the page never does). The current page is marked (`aria-current="page"`). Join us is the accent item. The `/apply/*` form steps keep their own focused layout, with no ribbon.

## Pages

| Path | Page | Content |
|---|---|---|
| `/` | Home | Hero (club name, lead line, Est. 2025, domain ticker tape), what we do, domains, events teaser, team teaser, join band |
| `/events` | Events | Events from `shared/content/events.ts`. The former site lists three with day and month only, under "archives"; they show as an archive without a year until the owner supplies years and details |
| `/team` | Our team | Core team, then one block per division: leads, mission line, members (`shared/content/team.ts`, from the former site) |
| `/projects` | Projects | Cards from `shared/content/projects.ts`; empty state until the owner sends projects |
| `/blog`, `/blog/:slug` | Blog | Markdown posts in `client/src/content/blog/*.md` with front matter; empty state until the owner sends posts |
| `/androlink` | Androlink | Member directory (the owner's pick for the "Krafterslink" slot): everyone from the team data, searchable and filterable by division, with their public profile links. No sign-in, no profiles to edit: the club edits the data file |
| `/join` | Join us | The recruitment landing (formerly `/`), unchanged; Apply now leads into `/apply/*` |

## Rules carried over

- User-facing interface text lives in `shared/copy.ts` (tagged `// added`). Club data (people, events, projects) lives in `shared/content/*.ts`; posts in Markdown.
- No auth, no accounts, no admin UI (PRD 1, CLAUDE.md).
- AA contrast, keyboard access, reduced motion, 360px first (NFR-02, DSN-10).
- Every choice not covered here is logged in `docs/DECISIONS.md`.
