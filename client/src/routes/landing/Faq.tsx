// Owner request: questions people ask before applying, on the pink band between the process and Apply now.
// Native details/summary, so every answer opens with a tap, Enter or Space and needs no script.
import { copy } from '@andropedia/shared';
import { SectionTitle } from '../../components/SectionTitle';
import { PlusIcon } from '../../icons/ui';
import { Ticker } from '../../components/Ticker';

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="band band-alt bg-pink text-ink [--focus:var(--ink)]">
      <div className="gutter mx-auto w-full max-w-[720px] py-12 md:py-16">
        <SectionTitle id="faq-title" underline="text-ink">
          {copy.faq.title}
        </SectionTitle>
        <ul className="mt-8 list-none space-y-3 p-0">
          {copy.faq.items.map(({ q, a }) => (
            <li key={q}>
              <details className="group rounded-sm border-2 border-ink open:bg-yellow">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-display text-lg leading-tight [&::-webkit-details-marker]:hidden">
                  {q}
                  <PlusIcon className="h-6 w-6 shrink-0 transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none" />
                </summary>
                <p className="px-4 pb-4 text-base leading-relaxed">{a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
      {/* The Error 404 joke from the Apply now modal, on tape. */}
      <div className="pb-12 md:pb-16">
        <Ticker items={[copy.modal.body]} />
      </div>
    </section>
  );
}
