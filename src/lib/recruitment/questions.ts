// The application's question bank: the single source of truth for the /join form, the server
// validation and the Google Sheet columns. Pure data + pure functions (safe in the browser).
//
// Everyone answers the BASIC details and the UNIVERSAL questions. Then the applicant picks ONE
// domain and answers only that domain's questions. Every answer is stored as text under the
// question's `id`, which is also its Google Sheet column header.

export type DomainId = "technical" | "web" | "design" | "media" | "pr";
export const DOMAIN_IDS: readonly DomainId[] = ["technical", "web", "design", "media", "pr"];

interface Base {
  /** Key in `answers` and the Google Sheet column header (snake_case). */
  id: string;
  label: string;
  hint?: string;
  required: boolean;
}
export type Question = Base &
  (
    | { kind: "text"; min?: number; maxLen: number; placeholder?: string }
    | { kind: "textarea"; min?: number; maxLen: number; placeholder?: string }
    | { kind: "url"; maxLen: number; placeholder?: string }
    /** One option. With `other`, an "Other" choice reveals a text box; it is stored as "Other: <text>". */
    | { kind: "choice"; options: string[]; other?: boolean }
    /** Several options (at least one when required). */
    | { kind: "multi"; options: string[] }
    /** A number from `from` to `to`, with labels for both ends. */
    | { kind: "scale"; from: number; to: number; lowLabel: string; highLabel: string }
  );

export const OTHER = "Other";
export const OTHER_PREFIX = "Other: ";

// ------------------------------------------------------------------ universal

export const UNIVERSAL_QUESTIONS: Question[] = [
  {
    id: "why_join",
    kind: "choice",
    label: "Why do you want to join?",
    required: true,
    other: true,
    options: [
      "Genuine passion for the craft",
      "Need certificates to prove to my parents I'm doing something",
      "My friend forced me to fill this out",
      "Free snacks at offline meetings",
    ],
  },
  {
    id: "elevator",
    kind: "choice",
    label: "If our club gets stuck in an elevator together, what are you doing?",
    required: true,
    options: [
      "Taking control and finding the emergency hatch",
      "Panicking quietly in the corner",
      "Recording a behind-the-scenes Reel for engagement",
      "Debugging the elevator's embedded firmware",
    ],
  },
];

// ------------------------------------------------------------------ per domain

export const DOMAIN_QUESTIONS: Record<DomainId, Question[]> = {
  media: [
    {
      id: "media_gear",
      kind: "choice",
      label: "Gear of choice",
      required: true,
      options: ["DSLR", "Mirrorless", "Phone camera with cinematic delusions", "Pure editing magic"],
    },
    {
      id: "media_sneeze",
      kind: "choice",
      label: "Crisis scenario: the chief guest sneezes mid-speech and makes a hilarious face. What happens to the photo?",
      required: true,
      options: ["Delete it immediately", "It becomes an internal team sticker within 4 minutes"],
    },
    {
      id: "media_trend",
      kind: "textarea",
      label: "Trend awareness: what current reel/video trend makes you want to throw your phone out the window?",
      required: true,
      min: 5,
      maxLen: 400,
    },
    {
      id: "media_portfolio",
      kind: "url",
      label: "Show off: a Google Drive link to your best photography or video edits",
      hint: 'Set access to "Anyone with the link can view", or our media lead will cry.',
      required: true,
      maxLen: 300,
      placeholder: "https://drive.google.com/...",
    },
  ],
  design: [
    {
      id: "design_logo_pop",
      kind: "textarea",
      label: 'Emotional trigger test: how do you react when someone says "make the logo pop" or "just use Canva real quick"?',
      required: true,
      min: 10,
      maxLen: 500,
    },
    {
      id: "design_font",
      kind: "choice",
      label: "Taste test: you must use one of these for an entire flagship event poster. Which?",
      required: true,
      options: ["Comic Sans", "Papyrus"],
    },
    {
      id: "design_font_defence",
      kind: "textarea",
      label: "Now defend your choice.",
      required: true,
      min: 10,
      maxLen: 500,
    },
    {
      id: "design_figma",
      kind: "scale",
      label: "Tool proficiency: Figma",
      required: true,
      from: 1,
      to: 5,
      lowLabel: "What is a vector?",
      highLabel: "I name all my frame layers properly",
    },
    {
      id: "design_illustrator",
      kind: "scale",
      label: "Tool proficiency: Illustrator",
      required: true,
      from: 1,
      to: 5,
      lowLabel: "What is a vector?",
      highLabel: "I name all my frame layers properly",
    },
    {
      id: "design_photoshop",
      kind: "scale",
      label: "Tool proficiency: Photoshop",
      required: true,
      from: 1,
      to: 5,
      lowLabel: "What is a vector?",
      highLabel: "I name all my frame layers properly",
    },
    {
      id: "design_portfolio",
      kind: "url",
      label: "Portfolio drop: your Behance, Dribbble or Drive folder of your cleanest designs",
      required: true,
      maxLen: 300,
      placeholder: "https://www.behance.net/...",
    },
  ],
  pr: [
    {
      id: "pr_pitch",
      kind: "textarea",
      label: "Pitch challenge: pitch our club to a corporate sponsor who thinks student clubs only exist to order pizza and post stories.",
      required: true,
      min: 30,
      maxLen: 800,
    },
    {
      id: "pr_crisis",
      kind: "textarea",
      label: "Damage control: a keynote speaker cancels 15 minutes before an auditorium full of 300 students. What is your immediate announcement strategy?",
      required: true,
      min: 30,
      maxLen: 800,
    },
    {
      id: "pr_cold_dm",
      kind: "scale",
      label: "Networking shamelessness: how comfortable are you cold-DMing a company VP on LinkedIn?",
      required: true,
      from: 1,
      to: 10,
      lowLabel: "Absolutely not",
      highLabel: "Already drafted it",
    },
    {
      id: "pr_experience",
      kind: "multi",
      label: "Past work: what have you handled before?",
      required: true,
      options: ["Sponsorships", "Emceeing", "Brand collaborations", "None yet, but I'm keen"],
    },
    {
      id: "pr_brag",
      kind: "textarea",
      label: "Brag a little about it (optional)",
      required: false,
      maxLen: 600,
    },
  ],
  technical: [
    {
      id: "tech_git_dog",
      kind: "textarea",
      label: "The explain-it-simply test: explain a Git merge conflict to a confused golden retriever.",
      required: true,
      min: 20,
      maxLen: 600,
    },
    {
      id: "tech_debug",
      kind: "choice",
      label: "Debugging confession: what is your go-to debugging method?",
      required: true,
      options: [
        'Strategic print("here 1"), print("here 2") statements',
        "Rubber duck debugging",
        "Staring blankly at Stack Overflow until inspiration strikes",
        "Rewriting the entire script from scratch",
      ],
    },
    {
      id: "tech_stack",
      kind: "textarea",
      label: "Hard skills: which languages/stacks do you actually know (not just the ones from a 10-minute crash course)?",
      required: true,
      min: 5,
      maxLen: 500,
    },
    {
      id: "tech_github",
      kind: "url",
      label: "Proof of work: your GitHub profile",
      required: true,
      maxLen: 300,
      placeholder: "https://github.com/you",
    },
    {
      id: "tech_weird_project",
      kind: "textarea",
      label: "What is the weirdest project you've ever built or attempted?",
      required: true,
      min: 20,
      maxLen: 800,
    },
  ],
  web: [
    {
      id: "web_center_div",
      kind: "textarea",
      label: "The ultimate test: how do you center a div on the first try without Googling it? (Wrong answers only)",
      required: true,
      min: 5,
      maxLen: 400,
    },
    {
      id: "web_faction",
      kind: "choice",
      label: "Faction choice",
      required: true,
      options: ["Frontend", "Backend", "Full-Stack"],
    },
    {
      id: "web_faction_reason",
      kind: "textarea",
      label: "Give one valid reason why your side is superior.",
      required: true,
      min: 10,
      maxLen: 500,
    },
    {
      id: "web_deploy_fail",
      kind: "textarea",
      label: "Disaster relief: the deployment fails 5 minutes before the product launch. Whose fault is it, and what is your rollback strategy?",
      required: true,
      min: 20,
      maxLen: 800,
    },
    {
      id: "web_showcase",
      kind: "textarea",
      label: "Code showcase: live deployment links or GitHub repos of websites you've worked on",
      hint: "Even the ones that slightly break on mobile. One link per line.",
      required: true,
      min: 8,
      maxLen: 600,
    },
  ],
};

/** Questions a given applicant sees: the universal ones, then their domain's. */
export const questionsFor = (domain: DomainId): Question[] => DOMAIN_QUESTIONS[domain];

/** Every question id in sheet-column order: universal first, then each domain's. */
export const ALL_QUESTION_IDS: string[] = [
  ...UNIVERSAL_QUESTIONS.map((q) => q.id),
  ...DOMAIN_IDS.flatMap((d) => DOMAIN_QUESTIONS[d].map((q) => q.id)),
];

// ------------------------------------------------------------------ validation

export type RawAnswers = Record<string, string | string[] | undefined>;

const REQUIRED_MSG = "Please answer this question.";

function isHttpUrl(v: string): boolean {
  return /^https?:\/\//i.test(v) && URL.canParse(v);
}

/** Checks one raw answer. Returns the cleaned text, or an error message. */
function checkAnswer(q: Question, raw: string | string[] | undefined): { value: string } | { error: string } {
  const text = (Array.isArray(raw) ? raw.join(", ") : (raw ?? "")).trim();

  if (q.kind === "multi") {
    // Normally a list. A string is accepted too, but only if it is exactly the canonical
    // ", "-joined form of listed options (option text itself may contain commas).
    const fromString = (): string[] => {
      const found = q.options.filter((o) => text.includes(o));
      return found.join(", ") === text ? found : [text];
    };
    const picked = (Array.isArray(raw) ? raw : text ? fromString() : []).map((v) => v.trim());
    if (picked.some((v) => !q.options.includes(v))) return { error: "Pick from the listed options." };
    const unique = q.options.filter((o) => picked.includes(o)); // canonical order, no repeats
    if (q.required && unique.length === 0) return { error: "Pick at least one option." };
    return { value: unique.join(", ") };
  }

  if (Array.isArray(raw)) return { error: "Invalid answer." };
  if (text === "") return q.required ? { error: REQUIRED_MSG } : { value: "" };

  switch (q.kind) {
    case "choice": {
      if (q.options.includes(text)) return { value: text };
      if (q.other && text.startsWith(OTHER_PREFIX.trimEnd())) {
        // `text` is trimmed, so "Other: " with nothing after it arrives as "Other:".
        const detail = text.slice(OTHER_PREFIX.trimEnd().length).trim();
        if (detail.length < 2) return { error: 'Tell us what "Other" means for you.' };
        if (detail.length > 200) return { error: "Keep it under 200 characters." };
        return { value: `${OTHER_PREFIX}${detail}` };
      }
      return { error: "Pick from the listed options." };
    }
    case "scale": {
      const n = Number(text);
      if (!Number.isInteger(n) || n < q.from || n > q.to) return { error: `Pick a number from ${q.from} to ${q.to}.` };
      return { value: String(n) };
    }
    case "url":
      if (text.length > q.maxLen || !isHttpUrl(text)) return { error: "Enter a valid http(s) link." };
      return { value: text };
    default:
      if (q.min && text.length < q.min) return { error: `Please write at least ${q.min} characters.` };
      if (text.length > q.maxLen) return { error: `Keep it under ${q.maxLen} characters.` };
      return { value: text };
  }
}

/**
 * Validates the answers for the universal questions plus the chosen domain's questions only.
 * Anything else in `raw` (e.g. answers to another domain) is dropped, so one application can
 * only ever carry one domain's answers.
 */
export function validateAnswers(
  domain: DomainId,
  raw: RawAnswers,
  scope: "all" | "universal" | "domain" = "all"
): { answers: Record<string, string>; errors: Record<string, string> } {
  const questions = [
    ...(scope === "domain" ? [] : UNIVERSAL_QUESTIONS),
    ...(scope === "universal" ? [] : DOMAIN_QUESTIONS[domain]),
  ];
  const answers: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const r = checkAnswer(q, raw[q.id]);
    if ("error" in r) errors[q.id] = r.error;
    else answers[q.id] = r.value;
  }
  return { answers, errors };
}
