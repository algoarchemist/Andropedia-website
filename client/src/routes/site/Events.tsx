// Club website Events (docs/CLUB-SITE.md). An event with a full date today or later is "coming up"; everything else,
// including the former site's events that have no year, is the archive.
import { EVENTS, INSTAGRAM_URL, copy, fmt, type ClubEvent } from '@andropedia/shared';
import { PageIntro } from '../../components/PageIntro';
import { SectionTitle } from '../../components/SectionTitle';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { EventDate } from './EventDate';

/** Upcoming needs a year: without one we cannot tell, so it stays in the archive. */
export function isUpcoming(event: ClubEvent, today = new Date()): boolean {
  if (!event.year) return false;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(event.year, event.month - 1, event.day) >= start;
}

function EventRow({ event, index }: { event: ClubEvent; index: number }) {
  return (
    <li
      className={`flex items-start gap-4 rounded-sm border-2 border-ink bg-paper p-3 text-ink md:p-4 ${index % 2 ? 'ml-4 md:ml-12' : 'mr-4 md:mr-12'}`}
    >
      <EventDate event={event} />
      <div className="min-w-0 pt-1">
        <h3 className="font-display text-xl leading-tight md:text-2xl">{event.name}</h3>
        {event.description && <p className="mt-2 leading-snug">{event.description}</p>}
      </div>
    </li>
  );
}

export default function Events() {
  useDocumentTitle(fmt(copy.site.docTitle, { page: copy.site.events.title }));
  const byDate = (a: ClubEvent, b: ClubEvent) => (a.year ?? 0) - (b.year ?? 0) || a.month - b.month || a.day - b.day;
  const upcoming = EVENTS.filter((e) => isUpcoming(e)).sort(byDate);
  const archive = EVENTS.filter((e) => !isUpcoming(e)).sort((a, b) => byDate(b, a));

  return (
    <>
      <PageIntro title={copy.site.events.title} intro={copy.site.events.intro} tone="orange" />

      <section aria-labelledby="events-upcoming" className="band bg-ink text-paper [--focus:var(--paper)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-12 md:pb-20 md:pt-16">
          <SectionTitle id="events-upcoming" underline="text-yellow">
            {copy.site.events.upcoming}
          </SectionTitle>
          {upcoming.length > 0 ? (
            <ul className="mt-8 list-none space-y-3 p-0">
              {upcoming.map((event, i) => (
                <EventRow key={event.id} event={event} index={i} />
              ))}
            </ul>
          ) : (
            <p className="mt-8 max-w-[40ch] text-lg">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-2 underline-offset-4">
                {copy.site.events.noneUpcoming}
              </a>
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="events-archive" className="band band-alt bg-yellow text-ink [--focus:var(--ink)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-12 md:pb-24 md:pt-16">
          <SectionTitle id="events-archive">{copy.site.events.archive}</SectionTitle>
          <ul className="mt-8 list-none space-y-3 p-0">
            {archive.map((event, i) => (
              <EventRow key={event.id} event={event} index={i} />
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
