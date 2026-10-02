// DSN-09: one flat SVG set on a 24px grid. Stroke style throughout, colored by `currentColor`.
// DSN-08: each icon exposes the parts that animate through `ico-*` classes (see styles/motion.css).
import type { ReactNode } from 'react';
import { DOMAINS } from '@andropedia/shared';

export type DomainIconName = (typeof DOMAINS)[number]['icon'];

type IconProps = { playing?: boolean; className?: string };

function Frame({ playing = false, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={`domain-icon ${className ?? ''}`}
      data-play={playing}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Technical: prompt and a cursor that blinks twice. */
export function Terminal(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="4" width="18" height="16" />
      <path d="M7 9l3 3-3 3" />
      <rect className="ico-cursor" x="12" y="14" width="5" height="2" fill="currentColor" stroke="none" />
    </Frame>
  );
}

/** Web development: a browser window whose bars slide in. */
export function Browser(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="4" width="18" height="16" />
      <path d="M3 9h18" />
      <path className="ico-bar" d="M6 13h12" />
      <path className="ico-bar ico-d1" d="M6 17h7" />
    </Frame>
  );
}

/** Media: a clapperboard whose arm snaps shut. */
export function Clapperboard(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3" y="11" width="18" height="9" />
      <g className="ico-clap">
        <rect x="3" y="5" width="18" height="5" />
        <path d="M8 5l-2 5M13 5l-2 5M18 5l-2 5" />
      </g>
    </Frame>
  );
}

/** PR: a megaphone that emits three short lines. */
export function Megaphone(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3 10v4h3l7 4V6L6 10H3z" />
      <path d="M6 14l1 5h3" />
      <path className="ico-wave" d="M16.5 8.5L20 7" />
      <path className="ico-wave ico-d1" d="M17 12h4" />
      <path className="ico-wave ico-d2" d="M16.5 15.5L20 17" />
    </Frame>
  );
}

/** Design: a pen that draws a quick squiggle. */
export function Pen(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M16 2l5 5L9 19H4v-5L16 2z" />
      <path className="ico-squiggle" d="M3 22q2-3 4 0t4 0 4 0" style={{ strokeDasharray: 30 }} />
    </Frame>
  );
}

/** R&D: a bulb that flickers on. */
export function Bulb(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 2a6.5 6.5 0 0 0-3.5 12v2.5h7V14A6.5 6.5 0 0 0 12 2z" />
      <path className="ico-lit" d="M12 6a3 3 0 0 0-1.8 5.4V13h3.6v-1.6A3 3 0 0 0 12 6z" fill="currentColor" stroke="none" />
      <path d="M9.5 20h5M10.5 22.5h3" />
    </Frame>
  );
}

const ICONS: Record<DomainIconName, (props: IconProps) => ReactNode> = {
  terminal: Terminal,
  browser: Browser,
  clapper: Clapperboard,
  megaphone: Megaphone,
  pen: Pen,
  bulb: Bulb,
};

export function DomainIcon({ name, ...props }: IconProps & { name: DomainIconName }) {
  const Icon = ICONS[name];
  return <>{Icon(props)}</>;
}
