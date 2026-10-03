// PRD 8.2. Runs on both client and server. The server never trusts the client.
import { z } from 'zod';
import {
  DEPARTMENTS,
  DOMAINS,
  LIMITS,
  NAME_REGEX,
  PHONE_IN_REGEX,
  REG_NO_REGEX,
  SECTION_REGEX,
  type DepartmentId,
  type DomainId,
} from './constants';
import { copy } from './copy';

/** Counts whitespace separated words. Shared so client and server count identically. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

const domainIds = DOMAINS.map((d) => d.id) as [DomainId, ...DomainId[]];
const departmentIds = DEPARTMENTS.map((d) => d.id) as [DepartmentId, ...DepartmentId[]];

// Normalisers (idempotent, so re-parsing parsed output is safe).
const asString = (v: unknown) => (typeof v === 'string' ? v : '');
const upper = (v: unknown) => asString(v).trim().toUpperCase();
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const toPhonePayload = (v: unknown) => {
  const digits = asString(v).replace(/[\s-]/g, '').replace(/^\+?91(?=\d{10}$)/, '');
  return PHONE_IN_REGEX.test(digits) ? `+91${digits}` : digits;
};

// A missing key (never typed into) is undefined, which zod reports with its own English default unless told otherwise.
const str = () => z.string({ required_error: copy.err.required, invalid_type_error: copy.err.required });
const required = str().trim().min(1, copy.err.required);

const longText = required
  .min(LIMITS.longTextMin, copy.err.minLength)
  .max(LIMITS.longTextMax, copy.err.minLength);

const httpsUrl = str()
  .trim()
  .url(copy.err.url)
  .refine((u) => u.startsWith('https://'), copy.err.url);

// Step shapes. Cross-field rules are attached below and on the merged schema.
const youShape = {
  name: str().trim().min(1, copy.err.required).regex(NAME_REGEX, copy.err.required),
  registerNumber: z.preprocess(upper, z.string().regex(REG_NO_REGEX, copy.err.regno)),
  email: z.preprocess(
    (v) => asString(v).trim().toLowerCase(),
    z.string().min(1, copy.err.required).email(copy.err.email),
  ),
  phone: z.preprocess(toPhonePayload, z.string().regex(/^\+91[6-9]\d{9}$/, copy.err.phone)),
  department: z.enum(departmentIds, { errorMap: () => ({ message: copy.err.required }) }),
  section: z.preprocess(upper, z.string().regex(SECTION_REGEX, copy.err.required)),
};

const domainShape = {
  domainPref1: z.enum(domainIds, { errorMap: () => ({ message: copy.err.required }) }),
  domainPref2: z.enum(domainIds, { errorMap: () => ({ message: copy.err.required }) }),
};

const aboutShape = {
  aboutYou: longText,
  whyDomain: longText,
  skills: longText,
  techStack: z
    .array(
      str().trim().min(1, copy.err.required).max(LIMITS.stackTagMaxLen, copy.err.minLength),
      { required_error: copy.err.required, invalid_type_error: copy.err.required },
    )
    .min(LIMITS.stackTagsMin, copy.err.required)
    .max(LIMITS.stackTagsMax),
  outsideAcademics: longText,
  whyAndropedia: longText,
  oneYearVision: longText,
};

const workShape = {
  workUrl: httpsUrl,
  portfolioUrl: z.preprocess(emptyToUndefined, httpsUrl.optional()),
  achievements: z
    .array(
      z.object({
        title: required.max(LIMITS.achievementTitleMax, copy.err.minLength),
        description: required.max(LIMITS.achievementDescMax, copy.err.minLength),
      }),
    )
    .min(LIMITS.achievementsMin, copy.err.required)
    .max(LIMITS.achievementsMax),
  photoId: z.string().uuid(copy.err.required),
};

const usShape = {
  hoursPerWeek: z
    .number({ invalid_type_error: copy.err.required, required_error: copy.err.required })
    .int()
    .min(LIMITS.hoursMin)
    .max(LIMITS.hoursMax),
  responsibility: z
    .number({ invalid_type_error: copy.err.required, required_error: copy.err.required })
    .int()
    .min(LIMITS.responsibilityMin)
    .max(LIMITS.responsibilityMax),
  inOtherClub: z.boolean({ required_error: copy.err.required, invalid_type_error: copy.err.required }),
  otherClubs: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(LIMITS.otherClubsMax, copy.err.minLength).optional(),
  ),
  clubShouldProvide: longText,
};

const lastShape = {
  rememberUs: required
    .max(LIMITS.longTextMax, copy.err.words)
    .refine((t) => countWords(t) <= LIMITS.rememberWordsMax, copy.err.words),
  website: z.string().max(0).optional(), // honeypot, must be empty (SEC-04)
};

// Cross-field rules, applied on both the step schema and the merged schema.
type DomainPair = { domainPref1: DomainId; domainPref2: DomainId };
type ClubInfo = { inOtherClub: boolean; otherClubs?: string | undefined };

const checkDomains = (v: DomainPair, ctx: z.RefinementCtx) => {
  if (v.domainPref2 === v.domainPref1) {
    ctx.addIssue({ code: 'custom', path: ['domainPref2'], message: copy.domain.pref2Reset });
  }
};
const checkClubs = (v: ClubInfo, ctx: z.RefinementCtx) => {
  if (v.inOtherClub && !v.otherClubs) {
    ctx.addIssue({ code: 'custom', path: ['otherClubs'], message: copy.err.required });
  }
};

export const youSchema = z.object(youShape);
export const domainSchema = z.object(domainShape).superRefine(checkDomains);
export const aboutSchema = z.object(aboutShape);
export const workSchema = z.object(workShape);
export const usSchema = z.object(usShape).superRefine(checkClubs);
export const lastSchema = z.object(lastShape);

export const applicationSchema = z
  .object({
    ...youShape,
    ...domainShape,
    ...aboutShape,
    ...workShape,
    ...usShape,
    ...lastShape,
  })
  .superRefine((v, ctx) => {
    checkDomains(v, ctx);
    checkClubs(v, ctx);
  });

/** Parsed (server-side) shape. Phone is +91XXXXXXXXXX, reg number and section are uppercased. */
export type ApplicationInput = z.infer<typeof applicationSchema>;
