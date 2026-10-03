// Owner request: tilted ticker tapes across the site. Decorative and aria-hidden: every word on a tape is already on
// the page or the site. A tape only moves while it crosses the screen, driven by the page scroll (motion.css
// `.ticker-track`), so nothing plays on its own (WCAG 2.2.2); it stays still under reduced motion or where scroll
// timelines are unsupported. `overflow: clip` (not hidden), so the tape does not become its own scroll container.
import { Fragment } from 'react';

const TONES = {
  yellow: 'bg-yellow text-ink',
  ink: 'bg-ink text-paper',
} as const;

const MARKS = {
  yellow: 'bg-red',
  ink: 'bg-yellow',
} as const;

// Words per tape, so even a one-word tape still spans the widest screen after drifting a quarter of its length.
const MIN_WORDS = 24;

type TickerProps = {
  items: readonly string[];
  tone?: keyof typeof TONES;
  /** Tailwind background class for the square marks between words; defaults to the tone's accent. */
  mark?: string;
  /** `down` tilts the other way; `reverse` drifts right instead of left. Alternate them so tapes do not all match. */
  tilt?: 'up' | 'down';
  reverse?: boolean;
};

export function Ticker({ items, tone = 'yellow', mark, tilt = 'up', reverse = false }: TickerProps) {
  const repeats = Math.max(4, Math.ceil(MIN_WORDS / items.length));
  return (
    <div
      aria-hidden="true"
      className={`relative z-10 -mx-8 overflow-clip border-y-2 border-ink py-2 md:py-3 ${TONES[tone]} ${
        tilt === 'up' ? '-rotate-[1.5deg]' : 'rotate-[1.5deg]'
      }`}
    >
      <div
        className={`ticker-track flex w-max items-center gap-5 whitespace-nowrap font-display text-lg uppercase leading-none md:gap-8 md:text-2xl ${
          reverse ? 'ticker-reverse' : ''
        }`}
      >
        {Array.from({ length: repeats }, (_, r) => (
          <Fragment key={r}>
            {items.map((item, i) => (
              <Fragment key={i}>
                <span>{item}</span>
                <span className={`block h-3 w-3 shrink-0 rotate-12 md:h-4 md:w-4 ${mark ?? MARKS[tone]}`} />
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
