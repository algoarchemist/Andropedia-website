// DSN-09: flat glyphs on the 24px grid for link tiles (APP-04-R1). Our own simple marks, not official logos.
import type { LinkService } from '../lib/links';

const frame = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  'aria-hidden': true,
  focusable: false,
};

/** GitHub: a branch, the thing people go there for. */
function Branch({ className }: { className?: string }) {
  return (
    <svg className={className} {...frame}>
      <rect x="4" y="3" width="4" height="4" />
      <rect x="4" y="17" width="4" height="4" />
      <rect x="16" y="6" width="4" height="4" />
      <path d="M6 7v10M18 10c0 4-6 3-11 7" />
    </svg>
  );
}

/** Google Drive or Docs: a folded document. */
function Doc({ className }: { className?: string }) {
  return (
    <svg className={className} {...frame}>
      <path d="M5 2h9l5 5v15H5z" />
      <path d="M14 2v5h5M8 12h8M8 16h8" />
    </svg>
  );
}

/** LinkedIn: a person card. */
function Person({ className }: { className?: string }) {
  return (
    <svg className={className} {...frame}>
      <rect x="2" y="4" width="20" height="16" />
      <rect x="5" y="8" width="5" height="5" />
      <path d="M5 16h5M13 9h6M13 13h6M13 16h4" />
    </svg>
  );
}

/** Any other link: two chain links. */
function Chain({ className }: { className?: string }) {
  return (
    <svg className={className} {...frame}>
      <path d="M10 14l4-4" />
      <path d="M9 7l2-2a4 4 0 0 1 6 0l2 2a4 4 0 0 1 0 6l-2 2" />
      <path d="M15 17l-2 2a4 4 0 0 1-6 0l-2-2a4 4 0 0 1 0-6l2-2" />
    </svg>
  );
}

const GLYPHS = { github: Branch, drive: Doc, linkedin: Person, link: Chain } satisfies Record<LinkService, unknown>;

export function ServiceGlyph({ service, className }: { service: LinkService; className?: string }) {
  const Glyph = GLYPHS[service];
  return <Glyph className={className} />;
}
