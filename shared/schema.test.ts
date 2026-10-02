import { describe, expect, it } from 'vitest';
import { LIMITS } from './constants';
import { copy } from './copy';
import {
  aboutSchema,
  applicationSchema,
  countWords,
  domainSchema,
  lastSchema,
  usSchema,
  workSchema,
  youSchema,
} from './schema';

const long = 'This is a long enough answer.';
const valid = {
  name: 'Asha Rao',
  registerNumber: 'ra2211003010123',
  email: ' Asha@Example.com ',
  phone: '9876543210',
  department: 'CSE',
  section: 'a1',
  domainPref1: 'WEB_DEV',
  domainPref2: 'DESIGN',
  aboutYou: long,
  whyDomain: long,
  skills: long,
  techStack: ['React', 'Node'],
  outsideAcademics: long,
  whyAndropedia: long,
  oneYearVision: long,
  workUrl: 'https://github.com/asha',
  portfolioUrl: '',
  achievements: [{ title: 'Won a hackathon', description: 'Built a thing in 24 hours.' }],
  photoId: '6f1c3a52-6d1b-4a0e-9c53-2f2f0d9a1b11',
  hoursPerWeek: 5,
  responsibility: 3,
  inOtherClub: false,
  clubShouldProvide: long,
  rememberUs: 'Because I will ship things and tell terrible jokes.',
};

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map((i) => i.message) ?? [];

describe('countWords', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['one', 1],
    ['  two   words  ', 2],
    ['line\nbreak\tand space', 4],
  ])('counts %j as %i', (text, n) => expect(countWords(text)).toBe(n));
});

describe('domainSchema', () => {
  it('accepts two different domains', () => {
    expect(domainSchema.safeParse({ domainPref1: 'MEDIA', domainPref2: 'PR' }).success).toBe(true);
  });
  it('rejects preference 2 equal to preference 1', () => {
    const r = domainSchema.safeParse({ domainPref1: 'MEDIA', domainPref2: 'MEDIA' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['domainPref2']);
    expect(messages(r)).toContain(copy.domain.pref2Reset);
  });
  it('rejects unknown domain ids', () => {
    expect(domainSchema.safeParse({ domainPref1: 'MEDIA', domainPref2: 'COOKING' }).success).toBe(false);
  });
});

describe('youSchema', () => {
  it('normalises reg number, email, phone and section', () => {
    const r = youSchema.parse(valid);
    expect(r.registerNumber).toBe('RA2211003010123');
    expect(r.email).toBe('asha@example.com');
    expect(r.phone).toBe('+919876543210');
    expect(r.section).toBe('A1');
  });
  it('is idempotent on its own output', () => {
    const once = youSchema.parse(valid);
    expect(youSchema.parse(once)).toEqual(once);
  });
  it('accepts a +91 prefixed phone', () => {
    expect(youSchema.parse({ ...valid, phone: '+91 98765 43210' }).phone).toBe('+919876543210');
  });
  it('rejects bad phone, reg number and email with copy messages', () => {
    expect(messages(youSchema.safeParse({ ...valid, phone: '12345' }))).toContain(copy.err.phone);
    expect(messages(youSchema.safeParse({ ...valid, registerNumber: 'RA12' }))).toContain(copy.err.regno);
    expect(messages(youSchema.safeParse({ ...valid, email: 'nope' }))).toContain(copy.err.email);
  });
});

describe('step schemas', () => {
  it('about: needs 1 to 15 tags of at most 30 chars', () => {
    const about = (techStack: string[]) => aboutSchema.safeParse({ ...valid, techStack }).success;
    expect(about([])).toBe(false);
    expect(about(['a'])).toBe(true);
    expect(about(Array.from({ length: LIMITS.stackTagsMax + 1 }, (_, i) => `t${i}`))).toBe(false);
    expect(about(['x'.repeat(LIMITS.stackTagMaxLen + 1)])).toBe(false);
  });
  it('about: long text has min and max', () => {
    expect(aboutSchema.safeParse({ ...valid, aboutYou: 'short' }).success).toBe(false);
    expect(aboutSchema.safeParse({ ...valid, aboutYou: 'x'.repeat(LIMITS.longTextMax + 1) }).success).toBe(false);
  });
  it('work: requires https links, 1 to 3 achievements, optional portfolio', () => {
    expect(workSchema.safeParse(valid).success).toBe(true);
    expect(workSchema.safeParse({ ...valid, workUrl: 'http://x.com' }).success).toBe(false);
    expect(workSchema.safeParse({ ...valid, achievements: [] }).success).toBe(false);
    const four = Array.from({ length: 4 }, () => ({ title: 't', description: 'd' }));
    expect(workSchema.safeParse({ ...valid, achievements: four }).success).toBe(false);
    expect(workSchema.safeParse({ ...valid, portfolioUrl: 'not a url' }).success).toBe(false);
  });
  it('us: bounds sliders and requires otherClubs when inOtherClub', () => {
    expect(usSchema.safeParse({ ...valid, hoursPerWeek: 8 }).success).toBe(false);
    expect(usSchema.safeParse({ ...valid, responsibility: 6 }).success).toBe(false);
    expect(usSchema.safeParse({ ...valid, hoursPerWeek: undefined }).success).toBe(false);
    expect(usSchema.safeParse({ ...valid, inOtherClub: true }).success).toBe(false);
    expect(usSchema.safeParse({ ...valid, inOtherClub: true, otherClubs: 'Robotics' }).success).toBe(true);
  });
  it('last: enforces the 30 word cap and the honeypot', () => {
    const words = (n: number) => Array.from({ length: n }, () => 'w').join(' ');
    expect(lastSchema.safeParse({ rememberUs: words(30) }).success).toBe(true);
    expect(messages(lastSchema.safeParse({ rememberUs: words(31) }))).toContain(copy.err.words);
    expect(lastSchema.safeParse({ rememberUs: 'hi', website: 'http://spam' }).success).toBe(false);
  });
});

describe('applicationSchema', () => {
  it('accepts a complete application', () => {
    const r = applicationSchema.safeParse(valid);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });
  it('applies the domain exclusion on the merged schema', () => {
    expect(applicationSchema.safeParse({ ...valid, domainPref2: valid.domainPref1 }).success).toBe(false);
  });
  it('requires otherClubs when inOtherClub is true', () => {
    expect(applicationSchema.safeParse({ ...valid, inOtherClub: true }).success).toBe(false);
  });
  it('rejects a filled honeypot', () => {
    expect(applicationSchema.safeParse({ ...valid, website: 'x' }).success).toBe(false);
  });
});
