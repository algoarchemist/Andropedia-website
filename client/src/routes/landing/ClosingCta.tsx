// LND-06: the page's only Apply now (OD-02, owner request), after the process, so the page reads about, domains,
// process, apply. A line above sells it, a line below takes away the "am I good enough" worry.
import { DOMAINS, copy } from '@andropedia/shared';
import { useConfig } from '../../state/config';
import { DOMAIN_FILL } from './Domains';
import { ApplyCta } from './ApplyCta';

/** The hero's "keep scrolling" link jumps here. */
export const APPLY_ANCHOR = 'apply';

export function ClosingCta({ onApply }: { onApply: () => void }) {
  const config = useConfig();
  const open = config?.recruitmentOpen === true;

  return (
    <section id={APPLY_ANCHOR} aria-labelledby="apply-lead" className="band bg-red text-ink [--focus:var(--ink)]">
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
        <h2
          id="apply-lead"
          className="mb-10 max-w-[16ch] -rotate-1 text-balance text-center font-display text-[clamp(1.75rem,7vw,3rem)] leading-[1.05] tracking-[-0.02em]"
        >
          {copy.cta.lead}
        </h2>
        <ApplyCta onApply={onApply} variant="secondary" className="w-full sm:w-auto" />
        {open && <p className="mt-7 max-w-[52ch] text-balance text-center font-semibold">{copy.cta.reassure}</p>}
      </div>
    </section>
  );
}
