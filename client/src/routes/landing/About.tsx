// LND-03: What we do. The owner's text: a big lead line, then the details. Do not invent club facts.
import { copy } from '@andropedia/shared';
import { SectionTitle } from '../../components/SectionTitle';

export function About() {
  return (
    <section aria-labelledby="about-title" className="band bg-green text-paper [--focus:var(--paper)]">
      <div className="gutter mx-auto w-full max-w-[720px] py-12 md:py-16">
        <SectionTitle id="about-title" underline="text-yellow">{copy.about.title}</SectionTitle>
        <p className="mt-8 max-w-[24ch] text-balance font-display text-[clamp(1.5rem,6vw,2.25rem)] leading-[1.1] tracking-[-0.01em]">
          {copy.about.body}
        </p>
        <p className="mt-6 max-w-[56ch] text-lg">{copy.about.bodyMore}</p>
        <p className="mt-4 max-w-[56ch] text-lg">{copy.about.bodyCrew}</p>
      </div>
    </section>
  );
}
