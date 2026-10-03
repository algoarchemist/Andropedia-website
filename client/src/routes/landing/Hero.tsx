// LND-02: four block-letter lines at staggered indents (DSN-05). No Apply now here: by owner request (OD-02) the
// only Apply now is the closing one, after the domains and the process.
import type { MouseEvent } from 'react';
import { DOMAINS, copy } from '@andropedia/shared';
import { Ticker } from '../../components/Ticker';
import { ArrowIcon } from '../../icons/ui';
import { useConfig } from '../../state/config';
import { APPLY_ANCHOR } from './ClosingCta';

const BIG = 'block font-display text-[clamp(3rem,14vw,7rem)] uppercase leading-[0.9] tracking-[-0.02em]';
const SMALL = 'block font-display text-[clamp(1.125rem,5vw,2rem)] uppercase leading-tight tracking-[-0.01em]';
// Line 2's solid color block.
const STRIP = 'inline-block px-2 pb-1 pt-2 md:px-4';

/**
 * Renders the copy verbatim, with each "|" in the accent color (yellow: 4.5:1 on the cobalt hero). A part keeps its
 * trailing bar (no break allowed before it), and the space after the bar sits outside the no-wrap span, so lines only
 * break after a bar.
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
              {!last && <span className="text-yellow"> |</span>}
            </span>
            {!last && ' '}
          </span>
        );
      })}
    </>
  );
}

/** Scrolls to the closing Apply now and puts keyboard focus on it (instantly under reduced motion). */
function jumpToApply(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById(APPLY_ANCHOR);
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  target.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
}

export function Hero() {
  const open = useConfig()?.recruitmentOpen === true;

  return (
    // Owner request: the hero is a cobalt block (paper text) with the logo tone on tone and the ticker tape below.
    <section className="relative isolate bg-cobalt text-paper [--focus:var(--paper)]">
      {/* The club logo, the centre of the hero, behind the lines. Decorative: the header already names the club. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center md:py-6">
        <div className="hero-mark aspect-[1208/1096] w-[112%] shrink-0 md:h-full md:max-h-[56rem] md:w-auto" />
      </div>
      <div className="gutter mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-screen-xl flex-col justify-center pb-10 pt-6 md:pt-10">
        {/* The {' '} between lines keeps words apart in the accessible name ("FOR THE", not "FORTHE"). */}
        <h1>
          <span className={`${BIG} ml-0`}>{copy.hero.l1}</span>{' '}
          {/* One solid color block behind every wrapped line. An inline background would paint over the line above at 0.9 line height. */}
          <span className={`${BIG} ml-8 mt-3 md:ml-24`}>
            <span className={`${STRIP} -rotate-1 bg-yellow text-ink`}>{copy.hero.l2}</span>
          </span>{' '}
          <span className={`${SMALL} ml-0 mt-5 md:mt-8`}>
            <Parts text={copy.hero.l3} />
          </span>{' '}
          <span className={`${SMALL} ml-8 mt-1 md:ml-24`}>
            <Parts text={copy.hero.l4} />
          </span>
        </h1>
        {/* OD-02: the hero has no Apply now, so it points to the one at the bottom. Hidden when closed. */}
        {open && (
          <a
            href={`#${APPLY_ANCHOR}`}
            onClick={jumpToApply}
            className="mt-8 inline-flex min-h-[44px] items-center self-start font-semibold underline decoration-2 underline-offset-4 md:mt-12 md:text-lg"
          >
            {/* One inline run, so the arrow follows the last word instead of floating at the edge. */}
            <span>
              {copy.hero.nudge}
              <ArrowIcon className="ml-2 inline h-5 w-5 rotate-90 align-[-0.2em]" />
            </span>
          </a>
        )}
      </div>
      <div className="pb-10 md:pb-20">
        <Ticker items={DOMAINS.map((d) => d.name)} />
      </div>
    </section>
  );
}
