// Club website: the colored band at the top of every page, with the page's h1 and a short intro.
import type { ReactNode } from 'react';

const TONES = {
  cobalt: 'bg-cobalt text-paper [--focus:var(--paper)]',
  green: 'bg-green text-paper [--focus:var(--paper)]',
  yellow: 'bg-yellow text-ink [--focus:var(--ink)]',
  orange: 'bg-orange text-ink [--focus:var(--ink)]',
  pink: 'bg-pink text-ink [--focus:var(--ink)]',
  red: 'bg-red text-ink [--focus:var(--ink)]',
} as const;

export type BandTone = keyof typeof TONES;

export function PageIntro({ title, intro, tone, children }: { title: string; intro: string; tone: BandTone; children?: ReactNode }) {
  return (
    <section className={TONES[tone]}>
      <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-10 md:pb-24 md:pt-16">
        <h1 className="font-display text-[clamp(2.75rem,12vw,5.5rem)] leading-[0.9] tracking-[-0.02em]">{title}</h1>
        <p className="mt-5 max-w-[46ch] text-lg md:text-xl">{intro}</p>
        {children}
      </div>
    </section>
  );
}

/** A plain content band below the intro; `band` gives it the angled top edge that overlaps the band above. */
export function Band({ tone, alt = false, children, label }: { tone: BandTone | 'ink' | 'paper'; alt?: boolean; children: ReactNode; label?: string }) {
  const tones = { ...TONES, ink: 'bg-ink text-paper [--focus:var(--paper)]', paper: 'bg-paper text-ink' };
  return (
    <section aria-label={label} className={`band ${alt ? 'band-alt' : ''} ${tones[tone]}`}>
      <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-12 md:pb-24 md:pt-16">{children}</div>
    </section>
  );
}
