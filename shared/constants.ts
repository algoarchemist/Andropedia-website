// PRD 8.1. Single source of truth for enums, limits and regexes.
// Domain and department ids match the Prisma enum names exactly.

export const DOMAINS = [
  { id: 'TECHNICAL', name: 'Technical',       tagline: 'Building apps, bots and everything tech',       color: 'cobalt', icon: 'terminal'  },
  { id: 'WEB_DEV',   name: 'Web development', tagline: 'Build anti slop websites',                      color: 'red',    icon: 'browser'   },
  { id: 'MEDIA',     name: 'Media',           tagline: 'Lights. Camera. Edit. Repeat.',                 color: 'yellow', icon: 'clapper'   },
  { id: 'PR',        name: 'PR',              tagline: 'From events to Instagram. We handle the hype.', color: 'orange', icon: 'megaphone' },
  { id: 'DESIGN',    name: 'Design',          tagline: 'We make posters, reels & all the aesthetics',   color: 'pink',   icon: 'pen'       },
  { id: 'RND',       name: 'R&D',             tagline: 'Ideas, innovation and impact',                  color: 'green',  icon: 'bulb'      },
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

export type DomainId = (typeof DOMAINS)[number]['id'];
export type DepartmentId = (typeof DEPARTMENTS)[number]['id'];

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

/** Input attribute limits (APP-01). The regexes above are what actually validate; these only cap what can be typed. */
export const INPUT_MAX = { name: 80, registerNumber: 15, phoneDigits: 10, section: 4 } as const;
export const PHONE_PREFIX = '+91';

/** LND-09: the club's official Instagram profile. The share token from the copied link is dropped. */
export const INSTAGRAM_URL = 'https://www.instagram.com/andropedia_srm.rmp/';

// PRD 11 (API-02, API-03, API-04, SEC-01). Per IP, per window.
export const RATE_LIMITS = { windowMs: 60 * 60 * 1000, check: 30, photo: 20, submit: 5 } as const;
export const JSON_BODY_LIMIT = '100kb'; // SEC-01

/** Accepted photo types, sniffed from magic bytes on the server (API-03). */
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;
/** Some browsers give HEIC files no MIME type, so the extension is checked too (API-03, client side). */
export const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const;
/** API-03: the client downscales to photoClientMaxEdge as JPEG at this quality before upload. */
export const PHOTO_JPEG_QUALITY = 0.8;

export const DRAFT_KEY = 'andropedia.apply.draft.v1';
