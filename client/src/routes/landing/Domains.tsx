// LND-04: six full-width rows with alternating indents (never a card grid). DSN-08: hover or press floods the row
// with the domain color from the left and plays the icon animation.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DOMAINS, copy } from '@andropedia/shared';
import { DomainIcon } from '../../icons/domains';
import { SectionTitle } from '../../components/SectionTitle';

type Domain = (typeof DOMAINS)[number];

export const DOMAIN_FILL: Record<Domain['color'], string> = {
  cobalt: 'bg-cobalt',
  red: 'bg-red',
  yellow: 'bg-yellow',
  orange: 'bg-orange',
  pink: 'bg-pink',
  green: 'bg-green',
};

// DSN-03: text on cobalt and green is paper, on everything else it is ink.
export const DARK = new Set<Domain['color']>(['cobalt', 'green']);

// DSN-05: fixed per index, never random per render. Degrees, within +-0.5.
const TILT = [-0.5, 0.4, -0.3, 0.5, -0.4, 0.3];

// A tap is over in ~100ms; keep the flood up long enough to see it.
const HOLD_AFTER_PRESS_MS = 600;

function DomainRow({ domain, index }: { domain: Domain; index: number }) {
  const [engaged, setEngaged] = useState(false);
  const release = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(release.current), []);

  const dark = DARK.has(domain.color);
  const style = { '--flood': `var(--${domain.color})`, transform: `rotate(${TILT[index % TILT.length]}deg)` } as CSSProperties;

  return (
    <li
      className={`domain-row flex min-h-[72px] items-center gap-4 rounded-sm border-2 border-ink bg-paper p-3 ${
        index % 2 === 1 ? 'ml-4 md:ml-16' : 'mr-4 md:mr-16'
      }`}
      style={style}
      data-engaged={engaged}
      data-tone={dark ? 'dark' : 'light'}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setEngaged(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setEngaged(false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        window.clearTimeout(release.current);
        setEngaged(true);
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'mouse') return;
        release.current = window.setTimeout(() => setEngaged(false), HOLD_AFTER_PRESS_MS);
      }}
      onPointerCancel={() => setEngaged(false)}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center border-2 border-ink ${DOMAIN_FILL[domain.color]} ${
          dark ? 'text-paper' : 'text-ink'
        }`}
      >
        <DomainIcon name={domain.icon} playing={engaged} className="h-8 w-8" />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-2xl leading-none tracking-[-0.01em]">{domain.name}</h3>
        <p className="mt-1 leading-snug">{domain.tagline}</p>
      </div>
    </li>
  );
}

export function Domains() {
  return (
    <section aria-labelledby="domains-title" className="gutter mx-auto w-full max-w-[720px] py-12 md:py-16">
      <SectionTitle id="domains-title">{copy.domains.title}</SectionTitle>
      <ul className="m-0 mt-8 list-none space-y-4 p-0">
        {DOMAINS.map((domain, i) => (
          <DomainRow key={domain.id} domain={domain} index={i} />
        ))}
      </ul>
    </section>
  );
}
