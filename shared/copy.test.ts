import { describe, expect, it } from 'vitest';
import { copy, fmt } from './copy';

/** Flattens the copy tree to dotted keys, e.g. `err.required`. Arrays count as leaves. */
function flatten(node: unknown, prefix = ''): Record<string, unknown> {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return { [prefix]: node };
  return Object.entries(node).reduce<Record<string, unknown>>(
    (acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }),
    {},
  );
}

// Every key in PRD section 9 (the `domains.*` row lives in DOMAINS).
const PRD_KEYS = [
  'hero.l1', 'hero.l2', 'hero.l3', 'hero.l4', 'cta.apply',
  'about.title', 'about.body', 'domains.title', 'process.title', 'process.steps',
  'modal.title', 'modal.body', 'modal.continue', 'closed.body',
  'nav.next', 'nav.back', 'draft.restored', 'draft.reset',
  'you.title', 'you.name', 'you.regno', 'you.email', 'you.phone', 'you.department', 'you.section',
  'domain.title', 'domain.pref1', 'domain.pref2', 'domain.prompt', 'domain.pref2Reset',
  'about.stepTitle', 'about.notFound', 'about.self', 'about.whyDomain', 'about.skills',
  'about.skillsHelp', 'about.stack', 'about.stackHelp', 'about.outside', 'about.outsideHelp',
  'about.whyClub', 'about.oneYear',
  'work.title', 'work.link', 'work.portfolio', 'work.proud', 'work.proudTitle', 'work.proudDesc',
  'work.photo', 'work.empty.link', 'work.empty.proud', 'work.empty.photo',
  'us.title', 'us.hours', 'us.responsibility', 'us.respLow', 'us.respHigh', 'us.sliderPrompt',
  'us.otherClub', 'us.otherClubList', 'us.goodClub',
  'last.title', 'last.intro', 'last.remember', 'last.submit', 'last.sending',
  'done.title', 'done.body', 'done.whatsapp', 'done.signoff',
  'notfound.body',
  'err.required', 'err.email', 'err.phone', 'err.regno', 'err.url', 'err.minLength', 'err.words',
  'err.duplicate', 'err.photoType', 'err.photoSize', 'err.network',
];

// Server-only messages added after the PRD table (phases 2 and 3). Tagged `// added` in copy.ts.
const ADDED_KEYS = [
  'err.server', 'err.rateLimit', 'err.unauthorized',
  'brand.name', 'modal.close', 'footer.body', // phase 3
  'draft.confirmTitle', 'draft.confirmBody', 'draft.confirmYes', 'draft.confirmNo', // phase 4
  'shell.siteTitle', 'shell.docTitle', 'shell.doneTitle', 'shell.guarded', 'shell.placeholder',
  'progress.label', 'progress.completed', 'progress.locked',
];
const ALL_KEYS = [...PRD_KEYS, ...ADDED_KEYS];

describe('copy deck', () => {
  const flat = flatten(copy);

  it('contains every PRD section 9 key', () => {
    expect(ALL_KEYS.filter((k) => !(k in flat))).toEqual([]);
  });

  it('has no keys beyond the PRD table and the logged additions', () => {
    expect(Object.keys(flat).filter((k) => !ALL_KEYS.includes(k))).toEqual([]);
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value === 'string') expect(value.trim(), key).not.toBe('');
    }
  });

  it('keeps brief copy verbatim', () => {
    expect(copy.hero.l2).toBe('THE NEXT BUNCH OF WEIRDOS');
    expect(copy.modal.title).toBe('Error 404');
    expect(copy.process.steps).toHaveLength(5);
  });

  it('flags the unwritten about body for the owner', () => {
    expect(copy.about.body).toBe('TODO_CONTENT');
  });
});

describe('fmt', () => {
  it('fills placeholders', () => {
    expect(fmt(copy.about.whyDomain, { domain: 'Design' })).toBe('Why did you pick Design?');
    expect(fmt(copy.done.signoff, { firstName: 'Asha' })).toBe('See you around, Asha.');
  });
  it('leaves unknown placeholders intact', () => {
    expect(fmt('Hi {who}', {})).toBe('Hi {who}');
  });
});
