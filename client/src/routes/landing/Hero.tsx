// LND-02: four block-letter lines at staggered indents (DSN-05), then Apply now.
import { copy } from '@andropedia/shared';
import { ApplyCta } from './ApplyCta';

const BIG = 'block font-display text-[clamp(3rem,14vw,7rem)] uppercase leading-[0.9] tracking-[-0.02em]';
const SMALL = 'block font-display text-[clamp(1.125rem,5vw,2rem)] uppercase leading-tight tracking-[-0.01em]';
// The two small lines sit on paper strips: their red bars need 3:1, which the logo wash behind would not give (NFR-02).
const STRIP = 'inline-block px-2 pb-1 pt-2 md:px-4';
// The negative margin cancels the padding, so the text stays on its own indent.
const PAPER_STRIP = 'inline-block -mx-2 bg-paper px-2 py-0.5 md:-mx-3 md:px-3';

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
    <section className="gutter relative isolate mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-screen-xl flex-col justify-center pb-12 pt-6 md:pt-10">
      {/* The club logo, the centre of the hero, behind the lines. Decorative: the header already names the club. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center md:py-6">
        <div className="hero-mark aspect-[1208/1096] w-[112%] shrink-0 md:h-full md:max-h-[56rem] md:w-auto" />
      </div>
      {/* The {' '} between lines keeps words apart in the accessible name ("FOR THE", not "FORTHE"). */}
      <h1>
        <span className={`${BIG} ml-0`}>{copy.hero.l1}</span>{' '}
        {/* One solid color block behind every wrapped line. An inline background would paint over the line above at 0.9 line height. */}
        <span className={`${BIG} ml-8 mt-3 md:ml-24`}>
          <span className={`${STRIP} -rotate-1 bg-yellow`}>{copy.hero.l2}</span>
        </span>{' '}
        <span className={`${SMALL} ml-0 mt-5 md:mt-8`}>
          <span className={PAPER_STRIP}>
            <Parts text={copy.hero.l3} />
          </span>
        </span>{' '}
        <span className={`${SMALL} ml-8 mt-1 md:ml-24`}>
          <span className={PAPER_STRIP}>
            <Parts text={copy.hero.l4} />
          </span>
        </span>
      </h1>
      <ApplyCta onApply={onApply} className="mt-8 md:mt-12 md:self-start" />
    </section>
  );
}
