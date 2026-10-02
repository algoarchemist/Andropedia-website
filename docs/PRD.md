# Andropedia Recruitment Website: Product Requirements

Version 1.0 · 3 Oct 2026 · Owner: Nithin R · Source brief: `recruitment_website_ideas.docx`

## 0. How to read this document (agents)

- This is reference material, not a script. `CLAUDE.md` holds the always-on rules. For each task, read only the sections that task's phase lists in section 14.
- Every requirement has a stable ID: `LND` landing, `SHL` application shell, `APP` application steps, `DONE` success screen, `DSN` design, `API` backend, `SEC` security, `ADM` admin, `NFR` non-functional, `OD` open decision.
- `(added)` marks anything that was not in the original brief and was added to make the product buildable. Everything else is from the brief. Section 17 maps every brief item to its IDs so nothing is lost.
- Priority: `P0` must ship, `P1` should ship, `P2` nice to have. Untagged requirements are P0.
- Copy in section 9 is final text. Constants in section 8 are canonical. If code and PRD disagree, the PRD wins.

## 1. Product summary

Andropedia needs a recruitment website that does two jobs: convince a new student, in a few seconds on a phone, that this club is worth joining, and collect a complete, comparable application from everyone who applies. The voice is playful and self-aware (Error 404 jokes, best drip photo, weirdos wanted). The visual direction is a deliberate rejection of generic tech-club aesthetics.

Goals
- G1. A student on a phone understands what Andropedia does, its six domains and the recruitment process before tapping Apply now.
- G2. A student can finish the application on a phone in under 10 minutes without losing data when they switch apps to copy a link. (added)
- G3. The core team receives clean, validated, deduplicated applications it can shortlist from.
- G4. Every applicant ends up in the WhatsApp community, where domain challenges are announced.

Non-goals for v1
- Applicant accounts, login, or editing an application after submission.
- Shortlisting, interview scheduling, or an admin dashboard. Only a CSV export ships (`ADM-01`).
- Domain challenge (preliminary task) submission. Announced later in WhatsApp.
- Dark mode, multiple themes, other languages.

Success metrics (added)
- Apply now to submit completion of at least 60%.
- Zero duplicate applications per register number or email.
- Lighthouse mobile performance of at least 90 on the landing page.

## 2. Users and context

- Primary users are students applying from Android and iOS phones, often on mobile data, often leaving the tab to copy a GitHub or Drive link from another app. Draft persistence (`SHL-04`) and paste-friendly link fields are P0 because of this.
- Secondary users are the club core team, who read applications from the CSV export.
- Register numbers follow the `RA` plus 13 digits format. The two digits after `RA` encode the admission year, which the export derives (`ADM-01`).

## 3. Flow and routes

```
/ (Landing) ── Apply now ──> Error 404 modal ── continue ──> /apply/you
/apply/you ─> /apply/domain ─> /apply/about ─> /apply/work ─> /apply/us ─> /apply/last ── submit ──> /apply/done
```

| Route | Screen (brief name) | Progress stage |
|---|---|---|
| `/` | Landing: About Andropedia, domains, recruitment process | none |
| `/apply/you` | Who are you (about you and general data) | 01 You |
| `/apply/domain` | Domain selection | 02 Domain, part a |
| `/apply/about` | Tell us about yourself (know you better) | 02 Domain, part b |
| `/apply/work` | Show us your work | 03 Work |
| `/apply/us` | Team and commitment | 04 Us |
| `/apply/last` | One last thing (final page) | 05 Done |
| `/apply/done` | After submission: domain challenge update and WhatsApp link | all five complete |

The brief has six form screens and five progress stages. The know-you-better questions are domain driven (why this domain, skills, stack), so they sit inside stage 02. See `OD-01`.

Route guards (`SHL-05`): a step cannot be opened while an earlier step is invalid; redirect to the first incomplete step. `/apply/done` without a submission id in session state redirects to `/`. Unknown routes show the 404 page (`DSN-11`).

## 4. Landing page (LND)

Design mode: expressive (`DSN-02`). Sections in this order, top to bottom.

- `LND-01` Header. Andropedia wordmark on the left. No navigation menu, since the page has nothing to navigate between. (added)
- `LND-02` Hero. Four lines in block letters (uppercase display type), then the Apply now button directly below them. Copy keys `hero.l1` to `hero.l4`. Lines 1 and 2 are the largest type on the whole site. Lines 3 and 4 are smaller; the `|` separators render in an accent color. Lines start at staggered left indents (`DSN-05`).
- `LND-03` What we do. Section title and a short paragraph on what Andropedia does. The brief gives no text for this, so it ships with `about.body` set to `TODO_CONTENT`. The release checklist (section 15) fails until it is filled. Do not invent club facts.
- `LND-04` Domains. All six domains from `DOMAINS`, each row showing domain icon, name and one-liner. Layout is a vertical stack of full-width rows with alternating indents, each row carrying its domain color (icon block or color band). Never a card grid, never three in a row. Hover on desktop or press on mobile triggers the domain micro-interaction (`DSN-08`).
- `LND-05` Recruitment process. Five steps in order: Register, Preliminary task submission, Shortlist for interview, Online interview, Woohoo you're a member. Rendered as a vertical track: big step numbers joined by a thick ink line. The final step gets a celebratory treatment (accent fill, slight rotation).
- `LND-06` Closing CTA. Apply now repeated after the process section, so the page also reads in the brief's order: about, domains, process, apply. (added, see `OD-02`)
- `LND-07` Apply now behavior. Every Apply now button opens the Error 404 modal (`modal.*` copy). The modal is a flat, square dialog styled like an old system error box: title bar `Error 404`, body `Boring applications are not accepted`, one primary button that navigates to `/apply/you`, or to the first incomplete step if a draft exists. Close icon, Esc and backdrop tap return to the landing page. Uses `role="alertdialog"`, traps focus, returns focus to the trigger on close.
- `LND-08` P1 Closed state (added). When `recruitmentOpen` is false (`API-01`), Apply now buttons are replaced with `closed.body` and every `/apply/*` route redirects to `/`.
- `LND-09` P2 Footer with Instagram and contact links. Content `TODO_CONTENT`. (added)

## 5. Application shell (SHL)

Design mode: clean and playful (`DSN-02`).

- `SHL-01` Progress bar, pinned to the top of every `/apply/*` screen (scrolls away is fine, sticky is not required). Five stages: `01 You`, `02 Domain`, `03 Work`, `04 Us`, `05 Done`. It must feel like a game.

  | State | Look | Interaction |
  |---|---|---|
  | Locked | Outline only, ink at 30% | Not tappable |
  | Current | Filled with stage color, number scaled about 15% larger | Not tappable |
  | Completed | Ink fill with a check stamp rotated a few degrees | Tap to go back to that stage |

  Stage 02 shows two small ticks under its number for parts a and b. When a step is passed, its stage plays a 300 to 400ms stamp animation, then the next stage pops into the current state (`DSN-08`). All five stages fit in 360px width without horizontal scroll: large numbers, labels at 11 to 12px below.
- `SHL-02` Step layout: progress bar, step title in display type, optional Andropedia helper line, fields, then Back (secondary) and Next (primary) buttons at the end of the content. Buttons sit in normal document flow, never fixed to the viewport bottom, so the keyboard cannot cover them. (added) Step 01's Back returns to the landing page.
- `SHL-03` Validation. Each step has a zod schema in `shared/schema.ts`. Validate a field on blur and the whole step on Next. On a failed Next: show inline errors, scroll to and focus the first invalid field, run a short shake on it (none under reduced motion). Error text comes from `err.*` copy.
- `SHL-04` Draft persistence (added). Autosave all step data to `localStorage` key `andropedia.apply.draft.v1`, debounced 400ms. Store `photoId` and `url`, never the file. On return, restore the draft and show a banner with `draft.restored` and a `draft.reset` action (asks for confirmation). Clear the draft after a successful submit. Wrap every storage call in try/catch; the form must work when storage is unavailable.
- `SHL-05` Navigation. Each step is its own route, so the browser and Android back button move to the previous step with data intact. Guards as in section 3. Tapping a completed stage navigates to it.
- `SHL-06` On step change, scroll to top and set the document title to `Step 0X · Andropedia Recruitment`.

## 6. Application steps (APP)

`APP-00` Rules for every field:
- Visible label above the field. No placeholder-only labels, no floating labels.
- Input font size at least 16px so iOS does not zoom on focus.
- Values are trimmed before validation and storage.
- Correct `type`, `inputmode`, `autocomplete` and `autocapitalize` on every input.
- Long text: 10 to 1000 characters when required (added limits). A character counter appears once the user passes 800.
- All fields are required unless marked optional. The brief marks only Portfolio/LinkedIn as optional.

### APP-01 Who are you? (stage 01)

| ID | Label key | Control | Rules |
|---|---|---|---|
| F1 | `you.name` | text, `autocomplete=name` | 2 to 80 chars, `NAME_REGEX` |
| F2 | `you.regno` | text, `autocapitalize=characters` | Uppercased, `REG_NO_REGEX`, unique |
| F3 | `you.email` | `type=email` | Valid, lowercased, unique. Optional domain lock (`OD-04`) |
| F4 | `you.phone` | `type=tel`, `inputmode=numeric`, fixed `+91` prefix shown outside the input | `PHONE_IN_REGEX`, stored as `+91XXXXXXXXXX` |
| F5 | `you.department` | Native `<select>`, styled to the theme | One of `DEPARTMENTS` (17 options, brief order) |
| F6 | `you.section` | text, `autocapitalize=characters` | Uppercased, `SECTION_REGEX` |

- `APP-01-R1` P1 (added). On Next, call `API-02` with F2 and F3. If either has already applied, block with `err.duplicate` so nobody fills six screens to be rejected at submit.
- The brief lists EEE twice in the department list. It appears once.

### APP-02 Domain selection (stage 02, part a)

| ID | Label key | Control | Rules |
|---|---|---|---|
| F1 | `domain.pref1` | `DomainPicker` | One of `DOMAINS` |
| F2 | `domain.pref2` | `DomainPicker` with F1's value removed | One of `DOMAINS`, not equal to F1. Required (`OD-03`) |

- `APP-02-R1` If F1 changes to F2's current value, clear F2 and show `domain.pref2Reset` under it.
- `APP-02-R2` The `DomainPicker` component is specified in `DSN-07`. It is the main playful moment of the form: domain logos, hover and tap animations.

### APP-03 Tell us about yourself (stage 02, part b)

The helper line `about.notFound` sits in small text directly under the step title (`OD-07`).

| ID | Label key | Control | Helper key | Rules |
|---|---|---|---|---|
| F1 | `about.self` | textarea | | Long text |
| F2 | `about.whyDomain` | textarea | | Long text. Label inserts the Preference 1 domain name (`OD-06`) |
| F3 | `about.skills` | textarea | `about.skillsHelp` | Long text |
| F4 | `about.stack` | `TagInput` | `about.stackHelp` | 1 to 15 tags, each up to 30 chars. Enter or comma adds a tag. Tags are square (radius 2px or less), never pills |
| F5 | `about.outside` | textarea | `about.outsideHelp` | Long text |
| F6 | `about.whyClub` | textarea | | Long text |
| F7 | `about.oneYear` | textarea | | Long text |

The brief's two helper lines for skills and stack (No experience? No problem / Everyone starts from somewhere) are split across F3 and F4 so neither field repeats the other.

### APP-04 Show us your work (stage 03)

This screen must feel like a portfolio wall, not a file upload form.

| ID | Label key | Control | Rules |
|---|---|---|---|
| F1 | `work.link` | `type=url` | Valid `https://` URL. GitHub and Google Drive or Docs links are detected for tile styling; any other https link is accepted |
| F2 | `work.portfolio` | `type=url` | Optional. Valid `https://` URL |
| F3 | `work.proud` | Repeatable group of 1 to 3 entries. Each entry: title (up to 80 chars) with a description beneath it (up to 400 chars) | At least one entry (`OD-05`) |
| F4 | `work.photo` | Image picker, `accept="image/*"` (camera and gallery both allowed) | JPEG, PNG, WebP, HEIC or HEIF. Up to 8MB before compression. Upload flow in `API-03` |

Wall rules
- `APP-04-R1` Each filled field becomes a tile on a pinboard. The photo is a polaroid-style tile with the applicant's first name as caption. Link tiles show a service glyph (GitHub, Drive, LinkedIn or generic link), the hostname and a shortened path. Achievement tiles look like index cards: title on top, description under it.
- `APP-04-R2` Empty slots show as dashed-outline tiles with a plus sign and a prompt (`work.empty.*`). Tapping a tile opens a plain, straight inline editor. All editing happens in standard inputs, never inside a rotated tile.
- `APP-04-R3` Layout: one column under 480px with alternating 8px horizontal offsets; two equal columns at 480px and above. Tiles rotate by a small deterministic angle derived from their index, between -1.5 and 1.5 degrees. Natural tile heights, no mixed column spans. This is not a bento grid.
- `APP-04-R4` The photo tile shows upload progress, a retry action on failure, and replace and remove actions once uploaded.
- `APP-04-R5` Never show a generic dropzone: no cloud icon, no drag-files-here text.

### APP-05 Team and commitment (stage 04)

| ID | Label key | Control | Rules |
|---|---|---|---|
| F1 | `us.hours` | `Slider`, 0 to 7, step 1, rightmost label `7+` | Stored as int 0 to 7, where 7 means 7 or more |
| F2 | `us.responsibility` | `Slider`, 0 to 5, step 1. End labels `us.respLow` at 0 and `us.respHigh` at 5 | Stored as int 0 to 5 |
| F3 | `us.otherClub` | Yes/No control: two square buttons side by side | Boolean |
| F3b | `us.otherClubList` | textarea, shown only when F3 is Yes | Required when F3 is Yes. Up to 300 chars |
| F4 | `us.goodClub` | textarea | Long text |

Sliders follow `DSN-07`: they start unset and count as answered only after the user moves them (added), so a default value is never mistaken for an answer.

### APP-06 One last thing (stage 05)

Intro line `last.intro` above the field.

| ID | Label key | Control | Rules |
|---|---|---|---|
| F1 | `last.remember` | textarea, 3 rows | 1 to 30 words. Words are the trimmed text split on whitespace |

- `APP-06-R1` Live counter `n / 30` under the field. Above 30 it turns error red, shows `err.words` and disables Submit. Typing is not blocked (blocking mid-edit is hostile); the server re-validates.
- `APP-06-R2` Submit button `last.submit` (added). On tap: disable it, show `last.sending`, `POST /api/applications` with the full payload (`API-04`).
  - 201: clear the draft, store the submission id in session state, go to `/apply/done`.
  - 409: show `err.duplicate`.
  - 400: navigate to the step that owns the first invalid field and show its errors.
  - Network failure: keep all data, show `err.network` with a retry action.
  - 403: recruitment closed, show `closed.body`.

## 7. Success screen (DONE)

- `DONE-01` The progress bar shows all five stages completed. The final stamp animation plays once.
- `DONE-02` Copy: `done.title` and `done.body`.
- `DONE-03` A huge WhatsApp button: full width, at least 72px tall, display type, opens `whatsappUrl` from `API-01`. Flat green fill from the palette, simple glyph, no official gradient logo.
- `DONE-04` P2 A short personal sign-off using the applicant's first name (`done.signoff`). (added)

## 8. Data

### 8.1 Constants (`shared/constants.ts`)

```ts
export const DOMAINS = [
  { id: 'TECHNICAL', name: 'Technical',       tagline: 'Building apps, bots and everything tech',      color: 'cobalt', icon: 'terminal'  },
  { id: 'WEB_DEV',   name: 'Web development', tagline: 'Build anti slop websites',                     color: 'red',    icon: 'browser'   },
  { id: 'MEDIA',     name: 'Media',           tagline: 'Lights. Camera. Edit. Repeat.',                color: 'yellow', icon: 'clapper'   },
  { id: 'PR',        name: 'PR',              tagline: 'From events to Instagram. We handle the hype.', color: 'orange', icon: 'megaphone' },
  { id: 'DESIGN',    name: 'Design',          tagline: 'We make posters, reels & all the aesthetics',  color: 'pink',   icon: 'pen'       },
  { id: 'RND',       name: 'R&D',             tagline: 'Ideas, innovation and impact',                 color: 'green',  icon: 'bulb'      },
] as const;

export const DEPARTMENTS = [
  { id: 'CSE', label: 'CSE' }, { id: 'CC', label: 'CC' }, { id: 'BDA', label: 'BDA' },
  { id: 'IOT', label: 'IOT' }, { id: 'CSBS', label: 'CSBS' }, { id: 'CYBERSECURITY', label: 'Cybersecurity' },
  { id: 'AI', label: 'AI' }, { id: 'AIML', label: 'AIML' }, { id: 'GT', label: 'GT' },
  { id: 'IT', label: 'IT' }, { id: 'ECE', label: 'ECE' }, { id: 'ECE_DS', label: 'ECE-DS' },
  { id: 'EEE', label: 'EEE' }, { id: 'BIOTECH', label: 'Biotech' }, { id: 'BIOMEDICAL', label: 'Biomedical' },
  { id: 'CIVIL', label: 'Civil' }, { id: 'MECHANICAL', label: 'Mechanical' },
] as const;

export const PROGRESS_STAGES = [
  { n: '01', label: 'You',    routes: ['/apply/you'] },
  { n: '02', label: 'Domain', routes: ['/apply/domain', '/apply/about'] },
  { n: '03', label: 'Work',   routes: ['/apply/work'] },
  { n: '04', label: 'Us',     routes: ['/apply/us'] },
  { n: '05', label: 'Done',   routes: ['/apply/last'] },
] as const;

export const REG_NO_REGEX   = /^RA\d{13}$/;          // applied after uppercasing
export const PHONE_IN_REGEX = /^[6-9]\d{9}$/;        // 10 digits, without +91
export const SECTION_REGEX  = /^[A-Z0-9]{1,4}$/;     // applied after uppercasing
export const NAME_REGEX     = /^[\p{L} .'-]{2,80}$/u;

export const LIMITS = {
  longTextMin: 10, longTextMax: 1000, longTextCounterFrom: 800,
  otherClubsMax: 300,
  stackTagsMin: 1, stackTagsMax: 15, stackTagMaxLen: 30,
  achievementsMin: 1, achievementsMax: 3, achievementTitleMax: 80, achievementDescMax: 400,
  rememberWordsMax: 30,
  photoMaxBytes: 8 * 1024 * 1024, photoClientMaxEdge: 1200, photoServerMaxEdge: 1080,
  hoursMin: 0, hoursMax: 7,            // 7 renders as 7+
  responsibilityMin: 0, responsibilityMax: 5,
} as const;

export const DRAFT_KEY = 'andropedia.apply.draft.v1';
```

### 8.2 Payload (`shared/schema.ts`)

One zod schema per step (`youSchema`, `domainSchema`, `aboutSchema`, `workSchema`, `usSchema`, `lastSchema`), merged into `applicationSchema`. Cross-field rules live on the merged schema: `domainPref2 !== domainPref1`, `otherClubs` required when `inOtherClub` is true. Export `countWords(text)` from the same file so client and server count identically. The submit payload is:

```ts
type ApplicationInput = {
  name: string; registerNumber: string; email: string; phone: string;   // phone as +91XXXXXXXXXX
  department: DepartmentId; section: string;
  domainPref1: DomainId; domainPref2: DomainId;
  aboutYou: string; whyDomain: string; skills: string; techStack: string[];
  outsideAcademics: string; whyAndropedia: string; oneYearVision: string;
  workUrl: string; portfolioUrl?: string;
  achievements: { title: string; description: string }[];
  photoId: string;
  hoursPerWeek: number; responsibility: number;
  inOtherClub: boolean; otherClubs?: string; clubShouldProvide: string;
  rememberUs: string;
  website?: string;  // honeypot, must be empty (SEC-04)
};
```

### 8.3 Database (`server/prisma/schema.prisma`)

```prisma
enum Domain { TECHNICAL WEB_DEV MEDIA PR DESIGN RND }
enum Department { CSE CC BDA IOT CSBS CYBERSECURITY AI AIML GT IT ECE ECE_DS EEE BIOTECH BIOMEDICAL CIVIL MECHANICAL }
enum ApplicationStatus { SUBMITTED SHORTLISTED INTERVIEWED ACCEPTED REJECTED }  // (added) for later rounds

model Application {
  id                String            @id @default(uuid())
  createdAt         DateTime          @default(now())
  status            ApplicationStatus @default(SUBMITTED)
  name              String
  registerNumber    String            @unique
  email             String            @unique
  phone             String
  department        Department
  section           String
  domainPref1       Domain
  domainPref2       Domain
  aboutYou          String
  whyDomain         String
  skills            String
  techStack         String[]
  outsideAcademics  String
  whyAndropedia     String
  oneYearVision     String
  workUrl           String
  portfolioUrl      String?
  achievements      Json              // [{ title, description }], 1 to 3
  photoId           String            @unique
  photo             Photo             @relation(fields: [photoId], references: [id])
  hoursPerWeek      Int               // 0 to 7, 7 means 7+
  responsibility    Int               // 0 to 5
  inOtherClub       Boolean
  otherClubs        String?
  clubShouldProvide String
  rememberUs        String
}

model Photo {
  id          String       @id @default(uuid())
  url         String
  createdAt   DateTime     @default(now())
  application Application?
}
```

Domain and department ids in `constants.ts` match the Prisma enum names exactly.

## 9. Copy deck (`shared/copy.ts`)

Source column: `brief` is verbatim, `edited` is the brief with a grammar or casing fix (originals in 9.1), `added` is new.

| Key | Text | Source |
|---|---|---|
| `hero.l1` | `WE'RE LOOKING FOR` | brief |
| `hero.l2` | `THE NEXT BUNCH OF WEIRDOS` | brief |
| `hero.l3` | `DESIGNERS \| DEVELOPERS \| BUILDERS` | brief |
| `hero.l4` | `PROBLEM SOLVERS \| CHAOS MANAGERS` | brief |
| `cta.apply` | `Apply now` | brief |
| `about.title` | `What we do` | brief |
| `about.body` | `TODO_CONTENT` | needs owner |
| `domains.title` | `Domains` | added |
| `domains.*` | Names and taglines live in `DOMAINS` (8.1) | brief |
| `process.title` | `Recruitment process` | brief |
| `process.steps` | `Register`, `Preliminary task submission`, `Shortlist for interview`, `Online interview`, `Woohoo you're a member` | brief |
| `modal.title` | `Error 404` | brief |
| `modal.body` | `Boring applications are not accepted` | brief |
| `modal.continue` | `I'm not boring. Let me in.` | added |
| `closed.body` | `Applications are closed. Catch us next round.` | added |
| `nav.next` / `nav.back` | `Next` / `Back` | added |
| `draft.restored` / `draft.reset` | `Picked up where you left off.` / `Start over` | added |
| `you.title` | `Who are you?` | brief |
| `you.name` | `Name` | brief |
| `you.regno` | `Register Number` | brief |
| `you.email` | `Email` | brief |
| `you.phone` | `Contact number` | brief |
| `you.department` | `Department` | brief |
| `you.section` | `Section` | brief |
| `domain.title` | `Domain selection` | brief |
| `domain.pref1` / `domain.pref2` | `Preference 1` / `Preference 2` | brief |
| `domain.prompt` | `Pick a domain` | added |
| `domain.pref2Reset` | `That's already your first pick. Choose a different second one.` | added |
| `about.stepTitle` | `Tell us about yourself` | brief |
| `about.notFound` | `error 404: boring application not found` | brief |
| `about.self` | `Tell us about yourself` | brief |
| `about.whyDomain` | `Why did you pick {domain}?` | brief |
| `about.skills` | `What are the skills you can flex?` | brief |
| `about.skillsHelp` | `No experience? No problem.` | brief |
| `about.stack` | `Tech stack you are interested in?` | brief |
| `about.stackHelp` | `Everyone starts from somewhere.` | brief |
| `about.outside` | `Something you do outside academics` | brief |
| `about.outsideHelp` | `Good at something we didn't list? We're listening.` | brief |
| `about.whyClub` | `Why Andropedia?` | brief |
| `about.oneYear` | `Where do you see yourself in 1 year after joining this club?` | brief |
| `work.title` | `Show us your work` | brief |
| `work.link` | `Show us your work (Drive link / GitHub profile)` | brief |
| `work.portfolio` | `Portfolio / LinkedIn (optional)` | brief |
| `work.proud` | `Something you are proud of / Achievements` | brief |
| `work.proudTitle` / `work.proudDesc` | `Title` / `Tell us more` | added |
| `work.photo` | `Drop a pic of yourself in your best drip` | brief |
| `work.empty.link` / `work.empty.proud` / `work.empty.photo` | `+ Pin your work` / `+ Pin something you're proud of` / `+ Pin your best drip` | added |
| `us.title` | `Team & Commitment` | brief |
| `us.hours` | `How many hours/week can you dedicate to the club?` | edited |
| `us.responsibility` | `How comfortable are you taking responsibility for an event/task?` | edited |
| `us.respLow` / `us.respHigh` | `Not at all` / `Always` | brief |
| `us.sliderPrompt` | `Slide to answer` | added |
| `us.otherClub` | `Are you part of any other club, now or before?` | edited |
| `us.otherClubList` | `If yes, mention them` | brief |
| `us.goodClub` | `What do you think a good technical club should provide its members?` | brief |
| `last.title` | `One last thing` | brief |
| `last.intro` | `We've gone through your application.` | brief |
| `last.remember` | `In 30 words, tell us why we should remember you.` | edited |
| `last.submit` | `Submit application` | added |
| `last.sending` | `Sending it to the core team...` | added |
| `done.title` | `We have received your application.` | brief |
| `done.body` | `Join our community and stay tuned for the domain challenges.` | brief |
| `done.whatsapp` | `Join the WhatsApp community` | added |
| `done.signoff` | `See you around, {firstName}.` | added, P2 |
| `notfound.body` | `Error 404: this page is as boring as it gets. Go back home.` | added |
| `err.required` | `This one's required.` | added |
| `err.email` | `That email doesn't look right.` | added |
| `err.phone` | `Enter a 10 digit mobile number.` | added |
| `err.regno` | `Register number is RA followed by 13 digits.` | added |
| `err.url` | `Paste a full link starting with https://` | added |
| `err.minLength` | `Give us a little more than that.` | added |
| `err.words` | `30 words max. Make every word count.` | added |
| `err.duplicate` | `This register number or email has already applied. We'll be in touch.` | added |
| `err.photoType` | `Use a JPG, PNG, WebP or HEIC photo.` | added |
| `err.photoSize` | `That photo is over 8 MB. Try a smaller one.` | added |
| `err.network` | `Couldn't reach us. Your answers are saved, try again.` | added |

### 9.1 Edits made to brief copy

- `Lights.Camera. Edit. Repeat.` became `Lights. Camera. Edit. Repeat.` (missing space).
- `dedicate for the club` became `dedicate to the club?`
- `How likely are you comfortable taking responsibility for an event/task` became `How comfortable are you taking responsibility for an event/task?`
- `Have you or are you part of any other club? If yes, mention them` became `Are you part of any other club, now or before?` plus the follow-up label `If yes, mention them`.
- `In 30 words tell us why we should remember you?` became `In 30 words, tell us why we should remember you.`
- `Whatsapp` became `WhatsApp`; `andropedia` in labels became `Andropedia`.
- Hero lines 3 and 4 are uppercased because the brief asks for the whole block in block letters.

## 10. Design system (DSN)

- `DSN-01` One theme across every page: a single light theme, the same tokens, type, icon set and component styles on landing, application, success and 404. No dark mode.
- `DSN-02` Three modes of one theme.

  | Mode | Where | Allowed | Not allowed |
  |---|---|---|---|
  | Expressive | Landing, success, 404 | Huge type, staggered indents, rotations up to 3 degrees, color blocks, decorative marks | Anything in the ban list |
  | Clean and playful | Application screens | Display type for titles, progress game, wall tiles, picker animations, helper jokes | Rotations above 1.5 degrees, decoration that competes with fields |
  | Extremely usable | Every input, label, error, button inside forms | Straight edges, aligned grid, generous touch targets, instant feedback | Any rotation, offset, animation that delays input, low contrast |

- `DSN-03` Color tokens (`client/src/styles/tokens.css`). All fills are flat.

  | Token | Hex | Use |
  |---|---|---|
  | `--paper` | `#F2EDE4` | Page background |
  | `--ink` | `#121212` | Text, borders, completed stages |
  | `--muted` | `#5C5A55` | Helper text |
  | `--cobalt` | `#2340E0` | Technical, focus ring |
  | `--red` | `#E5372A` | Web development, primary buttons |
  | `--yellow` | `#F7C51E` | Media, highlights |
  | `--orange` | `#F46A1E` | PR |
  | `--pink` | `#F49AC1` | Design |
  | `--green` | `#17773F` | R&D, WhatsApp button, success |
  | `--error` | `#C1271B` | Error text and borders |

  Text on yellow, orange, pink and red is `--ink`. Text on cobalt, green and ink is `--paper`. Every text and background pair must reach WCAG AA (4.5:1 body, 3:1 large text); verify with a contrast checker and log any token change in `DECISIONS.md`.
- `DSN-04` Typography. Self-host via `@fontsource`, Latin subset, `font-display: swap`.
  - Display: Archivo Black. Hero, step titles, progress numbers, big buttons. Hero size `clamp(3rem, 14vw, 7rem)`, line height 0.9, letter spacing -0.02em. Step titles `clamp(2rem, 9vw, 3.5rem)`.
  - Body: Instrument Sans, 400 and 600. Base 16px, line height 1.5.
  - Fallbacks: `'Arial Black', Impact, sans-serif` for display; `system-ui, sans-serif` for body.
  - No monospace font anywhere in v1.
- `DSN-05` Slightly imperfect layouts, with limits. Use staggered left indents on hero lines and domain rows, small rotations on decorative elements and tiles, a hand-drawn SVG underline under section titles, and a process track whose final step tilts. Rotations are deterministic (from index or fixed values), never random per render. Zero imperfection on inputs, labels, errors and form buttons.
- `DSN-06` Ban enforcement.
  - Tailwind theme overrides (not `extend`) remove the banned defaults:

    ```ts
    // client/tailwind.config.ts (theme, not theme.extend)
    borderRadius: { none: '0', sm: '2px', DEFAULT: '2px', md: '4px' },
    boxShadow: { none: 'none' },
    fontFamily: { display: ['"Archivo Black"', '"Arial Black"', 'Impact', 'sans-serif'],
                  body: ['"Instrument Sans"', 'system-ui', 'sans-serif'] },
    colors: { /* only the DSN-03 tokens plus transparent and currentColor */ },
    ```
  - `npm run check:design` runs `scripts/check-design.sh` and fails the build on any match:

    ```bash
    #!/usr/bin/env bash
    PATTERN='rounded-(full|lg|xl|2xl|3xl)|shadow-(sm|md|lg|xl|2xl|inner)|drop-shadow|backdrop-blur|bg-gradient|linear-gradient|radial-gradient|font-mono|text-shadow|filter:\s*blur|box-shadow:\s*(?!none)|border-radius:\s*(9999px|50%|([5-9]|[1-9][0-9]+)px)|purple|violet|fuchsia'
    if grep -rnP --include='*.ts' --include='*.tsx' --include='*.css' "$PATTERN" client/src; then
      echo "Design ban violated (see PRD DSN-06)"; exit 1
    fi
    ```
  - Full ban list from the brief: neon purple gradient, glowing text, matrix rain, circuit backgrounds, 3D robots, drop shadows everywhere, everything in a pill (buttons, badges, navigation, inputs, tags, cards), excessive glassmorphism, bento grids, three feature cards in a row, random monospace everywhere. Borders (2px ink) replace shadows for separation.
- `DSN-07` Components (`client/src/components/`).
  - `Button`: rectangular, 2px ink border, radius 2px. Primary has red fill and ink text; secondary has paper fill. Height 56px on mobile. Press state shifts the button 2px down and right (no shadow).
  - `Field`: wraps label, control, helper slot and error slot. Inputs are 52px tall, 2px ink border, radius 2px. Focus: cobalt border plus a 3px outline offset 2px. Error: `--error` border with error text and icon below.
  - `Select`: native `<select>` with custom chevron and the same box as `Field`.
  - `DomainPicker`: a custom inline dropdown. Closed, it shows the chosen domain (icon, name, tagline) or `domain.prompt`. Open, it expands inline and pushes content down (no floating overlay on mobile) into six large rows, each with domain logo, name and tagline. Desktop hover and mobile press flood the row with its domain color and play the domain's icon animation (`DSN-08`). Selecting stamps the row and collapses the picker. Built on `role="listbox"` semantics: arrow keys, Enter, Esc, typeahead, `aria-activedescendant`. Rows are at least 64px tall.
  - `Slider`: a native `input[type=range]` styled over, so it stays accessible. Square 28px thumb, 6px ink track, a tick and label under every stop, live value label above the thumb. Starts unset: ghost thumb, `us.sliderPrompt` shown, `aria-valuetext` reads Not answered. The first interaction sets it. `aria-valuetext` then gives a readable value such as `7 or more hours` or `4 out of 5`.
  - `TagInput`: text input plus square removable tags. Backspace on an empty input removes the last tag.
  - `WallTile`, `PhotoTile`: as `APP-04`.
  - `ProgressBar`: as `SHL-01`.
  - `ErrorModal`: as `LND-07`. Flat square box, 2px border, ink title bar.
- `DSN-08` Micro-interactions catalog. Motion tokens: fast 150ms, base 250ms, slow 400ms; easing `cubic-bezier(.2,.8,.2,1)`; pops use a light spring. Under `prefers-reduced-motion: reduce`, replace movement with an opacity change or nothing.

  | Where | Interaction |
  |---|---|
  | Technical icon | Terminal cursor blinks twice |
  | Web development icon | Browser window bars slide in |
  | Media icon | Clapperboard snaps shut |
  | PR icon | Megaphone emits three short lines |
  | Design icon | Pen draws a quick squiggle |
  | R&D icon | Bulb flickers on |
  | Domain row hover or press | Domain color floods in from the left, base duration |
  | Apply now press | Button presses in, then the modal drops in with a slight overshoot |
  | Progress stage completed | Check stamp lands with a small rotation, next number pops |
  | Invalid Next | First invalid field shakes once, fast |
  | Wall tile added | Tile drops onto the wall and settles at its rotation |
  | Submit success | All five stages stamp in sequence on the success screen |

- `DSN-09` Icons. One custom flat SVG set on a 24px grid, consistent stroke or solid style, colored with tokens. Domain icons as named in `DOMAINS`. No 3D, no robot mascots, no emoji as icons.
- `DSN-10` Mobile first. Design at 360px, check at 390px and 430px, then desktop at 1280px where content is capped at 720px wide (landing hero may go wider). Handle iOS safe areas with `env(safe-area-inset-*)`, use `100dvh` instead of `100vh`, touch targets at least 44px.
- `DSN-11` 404 page. Expressive mode, `notfound.body`, a button back to `/`. (added)

## 11. Backend (API, SEC, ADM)

Express app under `/api`. Every handler parses input with the shared zod schemas and returns errors as `{ errors: [{ path, message }] }`.

- `API-01` `GET /api/config` returns `{ recruitmentOpen: boolean, whatsappUrl: string }` from env. Cached client-side for the session.
- `API-02` P1 `POST /api/applications/check` takes `{ registerNumber, email }`, returns `{ registerNumberTaken: boolean, emailTaken: boolean }`. Rate limit 30 per hour per IP. (added)
- `API-03` `POST /api/uploads/photo`, multipart field `photo`.
  - Client first: check type and size, then downscale to 1200px on the long edge as JPEG quality 0.8 via canvas. If the browser cannot decode the file (some HEIC cases), send the original.
  - Server: multer memory storage with an 8MB limit. Sniff magic bytes with `file-type` and reject anything not JPEG, PNG, WebP or HEIC/HEIF. Use sharp to auto-rotate from EXIF, strip all metadata, resize to 1080px long edge, encode WebP quality 80. Save through the storage driver (`local` in dev, `cloudinary` in prod, `OD-09`). Create a `Photo` row.
  - Returns `{ photoId, url }`. Rate limit 20 per hour per IP. Orphaned photos are acceptable in v1.
- `API-04` `POST /api/applications`.
  - 403 when recruitment is closed.
  - Parse with `applicationSchema` after normalizing (trim, uppercase register number and section, lowercase email, build `+91` phone).
  - Check `photoId` exists and is not linked to another application.
  - Insert. A unique constraint failure on register number or email returns 409 `{ field }`.
  - Success returns 201 `{ id }`.
  - Rate limit 5 per hour per IP.
- `SEC-01` `helmet`, CORS restricted to `CLIENT_ORIGIN`, JSON body limit 100kb, HTTPS only in production.
- `SEC-02` Never log request bodies or any personal data. Log route, status and duration only.
- `SEC-03` Store text as plain text and render with React escaping only. No `dangerouslySetInnerHTML`.
- `SEC-04` Honeypot field `website`, hidden from users and assistive tech. If filled, return a fake 201 and store nothing.
- `SEC-05` `ALLOWED_EMAIL_DOMAIN`, when set, restricts emails to that domain on both client and server (`OD-04`).
- `ADM-01` P1 `GET /api/admin/applications.csv` with header `Authorization: Bearer ${ADMIN_EXPORT_TOKEN}`. One row per application, columns in schema order, plus derived `admissionYear` (20 plus the two digits after `RA`), `techStack` joined with `; `, achievements flattened as `title: description` joined with ` | `, absolute photo URL. Escape CSV injection: prefix any cell starting with `=`, `+`, `-` or `@` with a single quote. (added)

## 12. Non-functional requirements (NFR)

- `NFR-01` Performance: landing LCP under 2.5s on a mid-range Android over 4G, Lighthouse mobile performance at least 90, initial JS under 150KB gzipped. Lazy load the application routes and Motion.
- `NFR-02` Accessibility: WCAG 2.1 AA. Every input labelled, errors linked with `aria-describedby`, visible focus everywhere, full keyboard support for picker, sliders, tags and modal, correct heading order per screen.
- `NFR-03` Browsers: Chrome Android (last 2 versions), Safari iOS 16 and later, Samsung Internet (last 2), desktop Chrome, Safari, Firefox, Edge (last 2).
- `NFR-04` Device QA before release: one small Android (360px), one large Android, one iPhone with a notch. Check keyboard overlap, photo pick from camera and gallery, app switch and return (draft restore), back button between steps.
- `NFR-05` Tests: Vitest unit tests for `shared/` (regexes, `countWords`, pref 2 exclusion, conditional other-clubs field). Supertest for every API status in section 11. Playwright end-to-end happy path on Pixel 7 and iPhone 14 emulation, plus one duplicate-submit case. (added)

## 13. Repository and environment

```
/
├─ CLAUDE.md                 # always-on rules (copy as AGENTS.md for other agents)
├─ docs/PRD.md, docs/DECISIONS.md
├─ shared/                   # constants.ts, copy.ts, schema.ts, index.ts
├─ client/                   # Vite + React + TS
│  ├─ src/routes/            # Landing.tsx, NotFound.tsx, apply/{You,Domain,About,Work,Us,Last,Done}.tsx
│  ├─ src/components/        # Button, Field, Select, DomainPicker, Slider, TagInput, WallTile, PhotoTile, ProgressBar, ErrorModal
│  ├─ src/icons/             # flat SVG set (DSN-09)
│  ├─ src/state/draft.ts     # SHL-04
│  ├─ src/styles/tokens.css  # DSN-03
│  └─ tailwind.config.ts     # DSN-06
├─ server/
│  ├─ prisma/schema.prisma
│  └─ src/{routes/{config,applications,uploads,admin}.ts, storage/{index,local,cloudinary}.ts, middleware/{rateLimit,errors}.ts}
└─ scripts/check-design.sh
```

npm workspaces at the root. Root scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `check:design`.

| Env var | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | server | PostgreSQL connection |
| `PORT` | server | API port |
| `CLIENT_ORIGIN` | server | CORS origin |
| `WHATSAPP_COMMUNITY_URL` | server | `API-01`, `DONE-03` |
| `RECRUITMENT_OPEN` | server | `true` or `false`, `LND-08` |
| `ADMIN_EXPORT_TOKEN` | server | `ADM-01`, at least 32 random characters |
| `STORAGE_DRIVER` | server | `local` or `cloudinary` |
| `UPLOAD_DIR` | server | Local driver path |
| `CLOUDINARY_URL` | server | Cloudinary driver credentials |
| `ALLOWED_EMAIL_DOMAIN` | server, client | Optional, `SEC-05` |
| `VITE_API_BASE_URL` | client | API base URL |

## 14. Build order

Each phase lists the sections to read. Read nothing else for that phase. A phase is done when its checks pass along with `typecheck`, `lint`, `check:design` and `test`.

1. Foundation. Read 8, 10 (`DSN-03`, `DSN-04`, `DSN-06`), 13. Set up workspaces, locked Tailwind theme, tokens, fonts, `shared/` files, check-design script, test runners. Done when: shared unit tests pass and check-design catches a deliberately added `rounded-full`.
2. Backend. Read 8.2, 8.3, 11. Prisma schema and migration, `API-01` to `API-04`, `SEC-*`, storage drivers. Done when: Supertest covers 201, 400, 403, 409 and rate limiting, and an uploaded HEIC comes back as WebP without EXIF.
3. Landing. Read 4, 9, 10 (`DSN-02`, `DSN-05`, `DSN-07` Button and ErrorModal, `DSN-09`). Done when: `LND-01` to `LND-07` render correctly at 360px and the modal passes keyboard and screen reader checks.
4. Application shell. Read 3, 5, 10 (`DSN-07` ProgressBar). Routes, guards, progress states, draft save and restore. Done when: refreshing mid-form restores data and the back button moves between steps.
5. Steps 01 to 02b. Read 6 (`APP-00` to `APP-03`), 10 (`DSN-07` Field, Select, DomainPicker, TagInput, `DSN-08`). Done when: all field rules work, pref 2 excludes pref 1, the duplicate check blocks at step 01.
6. Step 03 portfolio wall. Read 6 (`APP-04`), 11 (`API-03`). Done when: tiles render per `APP-04-R1` to `R5` and photo upload works from camera and gallery on Android and iOS.
7. Steps 04, 05, submit and success. Read 6 (`APP-05`, `APP-06`), 7, 10 (`DSN-07` Slider). Done when: sliders start unset, the 30-word rule holds on client and server, and every submit outcome in `APP-06-R2` behaves as specified.
8. Polish. Read 10 (`DSN-08`, `DSN-10`), 12. Done when: every row of the micro-interaction table works, reduced motion is respected, Lighthouse and AA targets are met, `NFR-04` device QA passes.
9. Operations. Read 4 (`LND-08`, `LND-09`), 11 (`ADM-01`), 13. Done when: CSV export opens cleanly in Excel and Google Sheets, closed state works, production deploy is live.

## 15. Release checklist

- [ ] `about.body` and any other `TODO_CONTENT` replaced with real content.
- [ ] `WHATSAPP_COMMUNITY_URL` points to the live community and opens the WhatsApp app on Android and iOS.
- [ ] Hero shows all four block-letter lines above Apply now at 360px without overflow.
- [ ] Apply now always shows the Error 404 modal first.
- [ ] Progress bar shows `01 You` to `05 Done` and behaves like a game on every step.
- [ ] Department list has 17 entries with EEE once.
- [ ] Preference 2 never offers the Preference 1 domain.
- [ ] `Why did you pick {domain}?` shows the real domain name.
- [ ] All three Andropedia helper lines appear where specified.
- [ ] Show us your work looks like a wall, not an upload form.
- [ ] Hours slider ends at `7+`; responsibility slider reads `Not at all` to `Always`.
- [ ] The 30-word limit is enforced on client and server.
- [ ] Submitting the same register number or email twice returns the duplicate message.
- [ ] `npm run check:design` passes; a manual pass finds none of the banned styles.
- [ ] Draft survives app switch and refresh; it clears after submit.
- [ ] Lighthouse mobile at least 90 on landing; no AA contrast failures.
- [ ] CSV export works with the admin token and fails without it.

## 16. Open decisions (defaults already chosen)

Agents build the default. The owner can change any of these later; the change should touch only the cited IDs.

| ID | Question | Default |
|---|---|---|
| `OD-01` | Six form screens, five progress stages | Stage 02 holds Domain selection and Tell us about yourself |
| `OD-02` | Where Apply now sits | Hero at top, repeated after the process section |
| `OD-03` | Is Preference 2 required | Yes |
| `OD-04` | Restrict email to the college domain | Off; set `ALLOWED_EMAIL_DOMAIN` to enable |
| `OD-05` | Must freshers list an achievement | Yes, at least one, as the brief does not mark it optional. Consider making it optional given the no-experience messaging |
| `OD-06` | Which domain `Why did you pick X` refers to | Preference 1 |
| `OD-07` | Where `error 404: boring application not found` sits | Under the Tell us about yourself title |
| `OD-08` | Stack and hosting | React, Express, PostgreSQL and Prisma, the stack already used in the club's andropedia repo. Suggested hosting: Vercel for client, Render for server, Neon for PostgreSQL |
| `OD-09` | Photo storage | Cloudinary free tier in production, local disk in development |

## 17. Traceability: brief to requirements

| Brief item | Requirement IDs |
|---|---|
| Website flow (about, apply, you, domain, know you better, work, team, one last thing, WhatsApp) | Section 3, `SHL-05` |
| What we do in Andropedia | `LND-03` |
| Six domains with one-liners | `LND-04`, `DOMAINS` |
| Recruitment process (five steps) | `LND-05`, `process.steps` |
| Who are you page fields and department list | `APP-01` |
| Section field | `APP-01` F6 |
| Preference 1 and 2, second excludes first | `APP-02` |
| Tell us about yourself questions | `APP-03` |
| Why did you pick X (domain from previous page) | `APP-03` F2, `OD-06` |
| Show us your work fields, LinkedIn optional, achievements with description, drip pic | `APP-04` |
| Hours slider 0 to 7, max end 7+ | `APP-05` F1 |
| Responsibility slider 0 to 5, not at all to always | `APP-05` F2 |
| Other clubs, mention them | `APP-05` F3, F3b |
| What a good technical club should provide | `APP-05` F4 |
| Final page, 30-word limit | `APP-06` |
| After submission copy, huge WhatsApp button, domain challenges | `DONE-01` to `DONE-03` |
| WE'RE LOOKING FOR block above Apply now, block letters | `LND-02` |
| Big typography wherever necessary | `DSN-04` |
| Playful micro-interactions, domain dropdown with logos and hover or tap animations | `DSN-07` DomainPicker, `DSN-08` |
| Mobile first for Android and iOS | `DSN-10`, `NFR-03`, `NFR-04` |
| Progress like a game, 01 to 05, You Domain Work Us Done | `SHL-01`, `PROGRESS_STAGES` |
| Show your work as a portfolio wall | `APP-04-R1` to `R5` |
| Landing expressive, application clean and playful, inputs extremely usable | `DSN-02` |
| error 404 boring application not found | `APP-03`, `OD-07` |
| No experience? No problem / Everyone starts from somewhere | `APP-03` F3, F4 |
| Good at something we didn't list? We're listening | `APP-03` F5 |
| Error 404 alert after Apply now | `LND-07` |
| Strictly avoid list | `DSN-06` |
| Strong flat colors | `DSN-03` |
| Interesting typography | `DSN-04` |
| Slightly imperfect layouts | `DSN-05` |
| One theme across all pages | `DSN-01` |
