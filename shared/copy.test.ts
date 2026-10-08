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
  'footer.instagram', 'footer.linkedin', // LND-09
  'done.whatsappSoon', 'done.instagram', // success screen boxes
  'hero.nudge', 'cta.lead', 'cta.reassure', // closing Apply now
  'about.bodyMore', 'about.bodyCrew', // LND-03 paragraphs after the lead
  'faq.title', 'faq.items', // landing FAQ
  'site.docTitle', 'site.skip', 'site.navLabel', 'site.nav.home', 'site.nav.events', // club website
  'site.nav.team', 'site.nav.projects', 'site.nav.blog', 'site.nav.androlink', 'site.nav.join',
  'site.home.est', 'site.home.eventsTitle', 'site.home.eventsMore', 'site.home.teamTitle', 'site.home.teamBody',
  'site.home.teamMore', 'site.home.joinTitle', 'site.home.joinCta', 'site.events.title', 'site.events.intro',
  'site.events.upcoming', 'site.events.archive', 'site.events.noneUpcoming', 'site.team.title', 'site.team.intro',
  'site.team.core', 'site.team.members', 'site.team.count', 'site.projects.title', 'site.projects.intro',
  'site.projects.empty', 'site.projects.emptyCta', 'site.projects.by', 'site.projects.open', 'site.blog.title',
  'site.blog.intro', 'site.blog.empty', 'site.blog.read', 'site.blog.back', 'site.blog.by',
  'site.androlink.title', 'site.androlink.intro', 'site.androlink.search', 'site.androlink.filterLabel', 'site.androlink.all',
  'site.androlink.results', 'site.androlink.none', 'site.androlink.noLinks', 'site.androlink.linkLabel', 'site.androlink.sites.github',
  'site.androlink.sites.linkedin', 'site.androlink.sites.portfolio', 'site.androlink.sites.instagram',
  'draft.confirmTitle', 'draft.confirmBody', 'draft.confirmYes', 'draft.confirmNo', // phase 4
  'shell.siteTitle', 'shell.docTitle', 'shell.doneTitle', 'shell.guarded', 'shell.placeholder',
  'progress.label', 'progress.completed', 'progress.locked',
  'you.departmentPrompt', 'you.phonePrefix', 'field.counter', // phase 5
  'about.stackRemove', 'about.stackFull', 'about.stackList',
  'work.empty.portfolio', 'work.save', 'work.remove', 'work.replace', 'work.removePhoto', 'work.retry', // phase 6
  'work.uploading', 'work.linkTile', 'work.proudTile', 'work.photoAlt',
  'us.yes', 'us.no', 'us.hoursTickMax', 'us.hoursValue', 'us.hoursOne', 'us.hoursMaxValue', // phase 7
  'us.respValue', 'us.notAnswered', 'last.retry', 'last.honeypot',
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

  it('has the owner about text, not the placeholder (LND-03)', () => {
    expect(copy.about.body).not.toBe('TODO_CONTENT');
    expect(copy.about.bodyCrew).toContain('SKYLINX');
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
