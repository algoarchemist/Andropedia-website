// Club website Home (docs/CLUB-SITE.md): who we are, what we do, the domains, a look at events and the team, and the
// way in. Reuses the recruitment landing's What we do and Domains sections, and its hero's logo and ticker tape.
import { Link } from 'react-router-dom';
import { CORE_TEAM, DIVISIONS, DOMAINS, EVENTS, SITE_PATHS, copy, fmt } from '@andropedia/shared';
import { buttonClass } from '../../components/Button';
import { SectionTitle } from '../../components/SectionTitle';
import { Ticker } from '../../components/Ticker';
import { ArrowIcon } from '../../icons/ui';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { directory, initials } from '../../lib/people';
import { About } from '../landing/About';
import { Domains } from '../landing/Domains';
import { EventDate } from './EventDate';

const MORE_LINK =
  'mt-8 inline-flex min-h-[44px] items-center gap-2 font-semibold underline decoration-2 underline-offset-4';

export default function Home() {
  useDocumentTitle(copy.brand.name);
  const people = directory().length;

  return (
    <>
      <section className="relative isolate bg-cobalt text-paper [--focus:var(--paper)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-end overflow-clip">
          <div className="hero-mark aspect-[1208/1096] w-[95%] shrink-0 translate-x-[12%] md:w-[60rem]" />
        </div>
        <div className="gutter mx-auto w-full max-w-screen-xl pb-12 pt-10 md:pb-16 md:pt-20">
          <p className="inline-block -rotate-3 border-2 border-ink bg-yellow px-3 py-1 font-display text-lg uppercase text-ink">
            {copy.site.home.est}
          </p>
          <h1 className="mt-6 font-display text-[clamp(3.25rem,17vw,11rem)] uppercase leading-[0.85] tracking-[-0.03em]">
            {copy.brand.name}
          </h1>
          <p className="mt-6 max-w-[22ch] font-display text-[clamp(1.5rem,6vw,2.75rem)] leading-[1.05] tracking-[-0.01em]">
            {copy.about.body}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to={SITE_PATHS.join} className={buttonClass('primary', 'w-full gap-3 sm:w-auto')}>
              {copy.site.home.joinCta}
              <ArrowIcon className="h-5 w-5" />
            </Link>
            <Link to={SITE_PATHS.team} className={buttonClass('secondary', 'w-full sm:w-auto')}>
              {copy.site.home.teamMore}
            </Link>
          </div>
        </div>
        <div className="pb-12 md:pb-20">
          <Ticker items={DOMAINS.map((d) => d.name)} />
        </div>
      </section>

      <About />
      <Domains />

      <section aria-labelledby="home-events" className="band bg-yellow text-ink [--focus:var(--ink)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-12 md:pb-24 md:pt-16">
          <SectionTitle id="home-events">{copy.site.home.eventsTitle}</SectionTitle>
          <ul className="mt-8 list-none space-y-3 p-0">
            {EVENTS.map((event, i) => (
              <li
                key={event.id}
                className={`flex items-center gap-4 rounded-sm border-2 border-ink bg-paper p-3 ${i % 2 ? 'ml-4 md:ml-12' : 'mr-4 md:mr-12'}`}
              >
                <EventDate event={event} />
                <span className="font-display text-xl leading-tight md:text-2xl">{event.name}</span>
              </li>
            ))}
          </ul>
          <Link to={SITE_PATHS.events} className={MORE_LINK}>
            {copy.site.home.eventsMore}
            <ArrowIcon className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="home-team" className="band band-alt bg-pink text-ink [--focus:var(--ink)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-12 md:pb-24 md:pt-16">
          <SectionTitle id="home-team" underline="text-ink">
            {copy.site.home.teamTitle}
          </SectionTitle>
          <p className="mt-6 text-lg">
            {fmt(copy.site.home.teamBody, { people: String(people), divisions: String(DIVISIONS.length) })}
          </p>
          <ul className="mt-8 flex list-none flex-wrap gap-3 p-0">
            {CORE_TEAM.map((person, i) => (
              <li
                key={person.name}
                className="flex items-center gap-3 rounded-sm border-2 border-ink bg-paper py-2 pl-2 pr-4"
                style={{ transform: `rotate(${[-1, 0.8, -0.6][i % 3]}deg)` }}
              >
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center bg-ink font-display text-paper">
                  {initials(person.name)}
                </span>
                <span>
                  <span className="block font-semibold leading-tight">{person.name}</span>
                  <span className="block text-sm">{person.role}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link to={SITE_PATHS.team} className={MORE_LINK}>
            {copy.site.home.teamMore}
            <ArrowIcon className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="home-join" className="band bg-red text-ink [--focus:var(--ink)]">
        <div className="gutter mx-auto flex w-full max-w-[720px] flex-col items-center pb-20 pt-14 md:pb-28 md:pt-20">
          <h2
            id="home-join"
            className="max-w-[16ch] -rotate-1 text-balance text-center font-display text-[clamp(1.75rem,7vw,3rem)] leading-[1.05] tracking-[-0.02em]"
          >
            {copy.site.home.joinTitle}
          </h2>
          <span className="relative mt-10 inline-block w-full sm:w-auto">
            <span aria-hidden="true" className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-sm bg-ink" />
            <Link to={SITE_PATHS.join} className={buttonClass('secondary', 'cta-lift relative w-full gap-3 px-10 py-6 text-2xl sm:w-auto')}>
              {copy.site.home.joinCta}
              <ArrowIcon className="h-6 w-6" />
            </Link>
          </span>
        </div>
      </section>
    </>
  );
}
