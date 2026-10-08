// Club website Androlink (docs/CLUB-SITE.md): the member directory, the owner's pick for the "Krafterslink" slot.
// Everyone in the team data, searchable by name and filterable by division, with the public links they chose to share.
// No sign-in and nothing to edit here: the club edits shared/content/team.ts.
import { useId, useMemo, useState, type ComponentType } from 'react';
import { DOMAINS, copy, fmt, type DomainId, type PersonLinks } from '@andropedia/shared';
import { CONTROL_CLASS } from '../../components/Field';
import { PageIntro } from '../../components/PageIntro';
import { ServiceGlyph } from '../../icons/services';
import { InstagramIcon } from '../../icons/ui';
import { directory, initials } from '../../lib/people';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { DARK, DOMAIN_FILL } from '../landing/Domains';

const ALL = 'ALL';

const LINKS: { key: keyof PersonLinks; Icon: ComponentType<{ className?: string }> }[] = [
  { key: 'github', Icon: ({ className }) => <ServiceGlyph service="github" className={className} /> },
  { key: 'linkedin', Icon: ({ className }) => <ServiceGlyph service="linkedin" className={className} /> },
  { key: 'portfolio', Icon: ({ className }) => <ServiceGlyph service="link" className={className} /> },
  { key: 'instagram', Icon: InstagramIcon },
];

const OPTION =
  'flex min-h-[44px] cursor-pointer items-center rounded-sm border-2 border-ink px-3 font-semibold has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink';

export default function Androlink() {
  useDocumentTitle(fmt(copy.site.docTitle, { page: copy.site.androlink.title }));
  const people = useMemo(() => directory(), []);
  const [query, setQuery] = useState('');
  const [division, setDivision] = useState<DomainId | typeof ALL>(ALL);
  const searchId = useId();

  const divisions = DOMAINS.filter((d) => people.some((p) => p.domains.includes(d.id)));
  const needle = query.trim().toLowerCase();
  const shown = people.filter(
    (p) => (division === ALL || p.domains.includes(division)) && (!needle || p.name.toLowerCase().includes(needle)),
  );

  return (
    <>
      <PageIntro title={copy.site.androlink.title} intro={copy.site.androlink.intro} tone="cobalt" />

      <section aria-label={copy.site.androlink.title} className="band band-alt bg-yellow text-ink [--focus:var(--ink)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-20 pt-12 md:pb-28 md:pt-16">
          <label htmlFor={searchId} className="block font-semibold">
            {copy.site.androlink.search}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            className={`mt-2 ${CONTROL_CLASS}`}
          />

          <fieldset className="m-0 mt-6 border-0 p-0">
            <legend className="p-0 font-semibold">{copy.site.androlink.filterLabel}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[{ id: ALL, name: copy.site.androlink.all } as const, ...divisions].map((option) => (
                <label key={option.id} className={OPTION}>
                  <input
                    type="radio"
                    name="division"
                    value={option.id}
                    checked={division === option.id}
                    onChange={() => setDivision(option.id)}
                    className="sr-only"
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </fieldset>

          <p role="status" className="mt-6 font-semibold">
            {shown.length > 0 ? fmt(copy.site.androlink.results, { n: String(shown.length) }) : copy.site.androlink.none}
          </p>

          <ul className="mt-4 list-none space-y-3 p-0">
            {shown.map((person) => {
              const first = DOMAINS.find((d) => d.id === person.domains[0]);
              const shared = LINKS.filter(({ key }) => person.links[key]);
              return (
                <li key={person.name} className="flex flex-wrap items-center gap-4 rounded-sm border-2 border-ink bg-paper p-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-12 w-12 shrink-0 items-center justify-center font-display text-lg ${
                      first ? `${DOMAIN_FILL[first.color]} ${DARK.has(first.color) ? 'text-paper' : 'text-ink'}` : 'bg-ink text-paper'
                    } border-2 border-ink`}
                  >
                    {initials(person.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl leading-tight">{person.name}</h2>
                    <p className="text-sm">{person.roles.join(' · ')}</p>
                  </div>
                  {shared.length > 0 ? (
                    <ul className="flex list-none gap-1 p-0">
                      {shared.map(({ key, Icon }) => (
                        <li key={key}>
                          <a
                            href={person.links[key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={fmt(copy.site.androlink.linkLabel, { name: person.name, site: copy.site.androlink.sites[key] })}
                            className="flex h-11 w-11 items-center justify-center rounded-sm border-2 border-ink hover:bg-yellow"
                          >
                            <Icon className="h-6 w-6" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">{copy.site.androlink.noLinks}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
