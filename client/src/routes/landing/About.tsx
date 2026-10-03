// LND-03: What we do. The body ships as TODO_CONTENT until the club owner provides it. Do not invent club facts.
import { copy } from '@andropedia/shared';
import { SectionTitle } from '../../components/SectionTitle';

export function About() {
  return (
    <section aria-labelledby="about-title" className="band bg-cobalt text-paper [--focus:var(--paper)]">
      <div className="gutter mx-auto w-full max-w-[720px] py-12 md:py-16">
        <SectionTitle id="about-title" underline="text-yellow">{copy.about.title}</SectionTitle>
        <p className="mt-6 max-w-[60ch] text-lg">{copy.about.body}</p>
      </div>
    </section>
  );
}
