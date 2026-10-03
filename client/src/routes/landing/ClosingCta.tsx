// LND-06: Apply now repeated after the process, so the page reads about, domains, process, apply.
import { DOMAINS } from '@andropedia/shared';
import { DOMAIN_FILL } from './Domains';
import { ApplyCta } from './ApplyCta';

export function ClosingCta({ onApply }: { onApply: () => void }) {
  return (
    <section className="band band-alt bg-red text-ink [--focus:var(--ink)]">
      <div className="gutter mx-auto flex w-full max-w-[720px] flex-col items-center py-14 md:py-20">
        {/* Decorative strip of the six domain colors, each tilted a fixed amount (DSN-05). */}
        <div aria-hidden="true" className="mb-8 flex gap-2">
          {DOMAINS.map((d, i) => (
            <span
              key={d.id}
              className={`block h-6 w-6 border-2 border-ink ${DOMAIN_FILL[d.color]}`}
              style={{ transform: `rotate(${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg)` }}
            />
          ))}
        </div>
        <ApplyCta onApply={onApply} variant="secondary" className="w-full sm:w-auto" />
      </div>
    </section>
  );
}
