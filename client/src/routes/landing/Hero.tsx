// LND-02: four block-letter lines at staggered indents (DSN-05), then Apply now.
import { copy } from '@andropedia/shared';
import { ApplyCta } from './ApplyCta';

const BIG = 'block font-display text-[clamp(3rem,14vw,7rem)] uppercase leading-[0.9] tracking-[-0.02em]';
const SMALL = 'block font-display text-[clamp(1.125rem,5vw,2rem)] uppercase leading-tight tracking-[-0.01em]';

/**
 * Renders the copy verbatim, with each "|" in the accent color. A part keeps its trailing bar (no break allowed
 * before it), and the space after the bar sits outside the no-wrap span, so lines only break after a bar.
 */
function Parts({ text }: { text: string }) {
  const parts = text.split(' | ');
  return (
    <>
      {parts.map((part, i) => {
        const last = i === parts.length - 1;
        return (
          <span key={part}>
            <span className="whitespace-nowrap">
              {part}
              {!last && <span className="text-red"> |</span>}
            </span>
            {!last && ' '}
          </span>
        );
      })}
    </>
  );
}

export function Hero({ onApply }: { onApply: () => void }) {
  return (
    <section className="gutter mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-screen-xl flex-col justify-center pb-12 pt-6 md:pt-10">
      {/* The {' '} between lines keeps words apart in the accessible name ("FOR THE", not "FORTHE"). */}
      <h1>
        <span className={`${BIG} ml-0`}>{copy.hero.l1}</span>{' '}
        {/* One solid color block behind every wrapped line. An inline background would paint over the line above at 0.9 line height. */}
        <span className={`${BIG} ml-8 mt-3 md:ml-24`}>
          <span className="inline-block -rotate-1 bg-yellow px-2 pb-1 pt-2 md:px-4">{copy.hero.l2}</span>
        </span>{' '}
        <span className={`${SMALL} ml-0 mt-5 md:mt-8`}>
          <Parts text={copy.hero.l3} />
        </span>{' '}
        <span className={`${SMALL} ml-8 mt-1 md:ml-24`}>
          <Parts text={copy.hero.l4} />
        </span>
      </h1>
      <ApplyCta onApply={onApply} className="mt-8 md:mt-12 md:self-start" />
    </section>
  );
}
