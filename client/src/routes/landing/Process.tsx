// LND-05: five steps on a vertical track, big numbers joined by a thick ink line. The last step is celebratory.
import { useEffect, useRef, useState } from 'react';
import { copy } from '@andropedia/shared';
import { BurstIcon } from '../../icons/ui';
import { Ticker } from '../../components/Ticker';
import { SectionTitle } from '../../components/SectionTitle';

// The hero's two small lines, one role per word on the tape.
const ROLES = [copy.hero.l3, copy.hero.l4].flatMap((line) => line.split(' | '));

export function Process() {
  const steps = copy.process.steps;
  const lastRef = useRef<HTMLLIElement>(null);
  const [stamped, setStamped] = useState(false);

  // The stamp lands the first time the final step scrolls into view.
  useEffect(() => {
    const el = lastRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setStamped(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStamped(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-labelledby="process-title" className="band bg-yellow">
      <div className="gutter mx-auto w-full max-w-[720px] pb-14 pt-12 md:pb-16 md:pt-16">
        <SectionTitle id="process-title">{copy.process.title}</SectionTitle>
        <ol className="relative m-0 mt-10 list-none p-0 [--half:2rem] md:[--half:2.5rem]">
          {/* The track: a 4px ink line from the first number's center to the last. */}
          <span
            aria-hidden="true"
            className="absolute bottom-[var(--half)] left-[calc(var(--half)-2px)] top-[var(--half)] w-[4px] bg-ink"
          />
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <li key={step} ref={last ? lastRef : undefined} className={`relative flex items-center gap-5 ${last ? '' : 'pb-10'}`}>
                <span
                  className={`relative z-10 flex h-[calc(var(--half)*2)] w-[calc(var(--half)*2)] shrink-0 items-center justify-center border-2 border-ink font-display text-3xl leading-none md:text-4xl ${
                    last ? '-rotate-6 scale-110 bg-red' : 'bg-paper'
                  }`}
                >
                  {i + 1}
                </span>
                {last ? (
                  <span className="relative block rotate-[1.5deg] rounded-sm border-2 border-ink bg-green px-4 py-3 text-xl font-semibold leading-snug text-paper md:text-2xl">
                    {step}
                    <span className="stamp absolute -right-2 -top-6 block md:-right-6" data-in={stamped}>
                      <BurstIcon className="h-12 w-12 rotate-12 fill-paper text-ink md:h-14 md:w-14" />
                    </span>
                  </span>
                ) : (
                  <span className="text-xl font-semibold leading-snug md:text-2xl">{step}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="pb-12 md:pb-16">
        <Ticker items={ROLES} tone="ink" tilt="down" reverse />
      </div>
    </section>
  );
}
