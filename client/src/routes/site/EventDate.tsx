// Club website: an event's date as a flat block, day over month (and the year when the data has one).
import type { ClubEvent } from '@andropedia/shared';

const month = (m: number) => new Date(2000, m - 1, 1).toLocaleString('en-IN', { month: 'short' });

/** "12 Apr" or "12 Apr 2026": the readable form, for text and screen readers. */
export const eventDateText = (event: ClubEvent) =>
  `${event.day} ${month(event.month)}${event.year ? ` ${event.year}` : ''}`;

export function EventDate({ event }: { event: ClubEvent }) {
  return (
    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-sm border-2 border-ink bg-ink text-paper">
      <span className="sr-only">{eventDateText(event)}</span>
      <span aria-hidden="true" className="font-display text-2xl leading-none">
        {event.day}
      </span>
      <span aria-hidden="true" className="mt-1 text-xs font-semibold uppercase leading-none tracking-[0.04em]">
        {month(event.month)}
        {event.year ? ` ${String(event.year).slice(-2)}` : ''}
      </span>
    </span>
  );
}
