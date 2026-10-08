// Club website Our team (docs/CLUB-SITE.md): the core team, then one band per division in its domain color with the
// leads, the mission line and the members. Data: shared/content/team.ts.
import { CORE_TEAM, DIVISIONS, DOMAINS, copy, fmt, type Division } from '@andropedia/shared';
import { PageIntro } from '../../components/PageIntro';
import { SectionTitle } from '../../components/SectionTitle';
import { DomainIcon } from '../../icons/domains';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { domainName, initials } from '../../lib/people';
import { DARK, DOMAIN_FILL } from '../landing/Domains';

/** Initials in a flat square: the site has no member photos yet. */
function Avatar({ name, className = 'bg-ink text-paper' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center font-display text-lg ${className}`}>
      {initials(name)}
    </span>
  );
}

function DivisionBand({ division, index }: { division: Division; index: number }) {
  const domain = DOMAINS.find((d) => d.id === division.domain)!;
  const dark = DARK.has(domain.color);
  const headingId = `team-${domain.id.toLowerCase()}`;
  return (
    <section
      aria-labelledby={headingId}
      className={`band ${index % 2 ? 'band-alt' : ''} ${DOMAIN_FILL[domain.color]} ${
        dark ? 'text-paper [--focus:var(--paper)]' : 'text-ink [--focus:var(--ink)]'
      }`}
    >
      <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-12 md:pb-20 md:pt-16">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-current">
            <DomainIcon name={domain.icon} className="h-8 w-8" />
          </span>
          <h2 id={headingId} className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[0.95] tracking-[-0.02em]">
            {domainName(division.domain)}
          </h2>
        </div>
        <p className="mt-5 max-w-[46ch] text-lg">{division.mission}</p>

        <ul className="mt-8 list-none space-y-3 p-0">
          {division.leads.map((lead, i) => (
            <li
              key={lead.name}
              className="flex items-center gap-4 rounded-sm border-2 border-ink bg-paper p-3 text-ink sm:max-w-[26rem]"
              style={{ transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)` }}
            >
              <Avatar name={lead.name} />
              <span>
                <span className="block font-display text-xl leading-tight">{lead.name}</span>
                <span className="block font-semibold">{lead.role}</span>
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mt-10 font-semibold uppercase tracking-[0.04em]">
          {copy.site.team.members} <span className="font-normal">({fmt(copy.site.team.count, { n: String(division.members.length) })})</span>
        </h3>
        <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
          {division.members.map((member) => (
            <li key={member.name} className="rounded-sm border-2 border-ink bg-paper px-3 py-1.5 font-semibold text-ink">
              {member.name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Team() {
  useDocumentTitle(fmt(copy.site.docTitle, { page: copy.site.team.title }));
  return (
    <>
      <PageIntro title={copy.site.team.title} intro={copy.site.team.intro} tone="green" />

      <section aria-labelledby="team-core" className="band band-alt bg-ink text-paper [--focus:var(--paper)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-12 md:pb-20 md:pt-16">
          <SectionTitle id="team-core" underline="text-yellow">
            {copy.site.team.core}
          </SectionTitle>
          <ul className="mt-8 list-none space-y-3 p-0">
            {CORE_TEAM.map((person, i) => (
              <li
                key={person.name}
                className={`flex items-center gap-4 rounded-sm border-2 border-paper p-3 ${i % 2 ? 'ml-4 md:ml-12' : 'mr-4 md:mr-12'}`}
              >
                <Avatar name={person.name} className="bg-yellow text-ink" />
                <span>
                  <span className="block font-display text-xl leading-tight md:text-2xl">{person.name}</span>
                  <span className="block font-semibold">{person.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {DIVISIONS.map((division, i) => (
        <DivisionBand key={division.domain} division={division} index={i} />
      ))}
    </>
  );
}
