// DSN-07 WallTile (APP-04). A pinboard of tiles: one column under 480px with alternating 8px offsets, two equal
// columns from 480px, each tile tilted by a fixed angle from its index (-1.5 to 1.5 degrees). Natural heights,
// no column spans. Tiles are buttons that open a straight inline editor; nothing is edited inside a tilted tile.
import type { CSSProperties, ReactNode } from 'react';
import { copy, fmt } from '@andropedia/shared';
import { AlertIcon } from '../icons/ui';
import { ServiceGlyph } from '../icons/services';
import type { LinkParts } from '../lib/links';

// APP-04-R3: deterministic, never random per render. Degrees, within +-1.5.
const TILT = [-1.2, 0.9, -0.6, 1.4, -1.0, 0.7, -1.5, 1.1];
export const tiltFor = (index: number) => TILT[index % TILT.length]!;

export function Wall({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 min-[480px]:items-start">{children}</ul>;
}

type WallSlotProps = {
  index: number;
  /** Schema path this tile stands for; Next focuses it when that path (or a child path) is invalid. */
  field: string;
  /** True once the tile was filled during this visit: it drops onto the wall (DSN-08). */
  fresh?: boolean;
  error?: string;
  /** Straight, untilted content under the tile (photo actions). */
  below?: ReactNode;
  children: ReactNode;
};

export function WallSlot({ index, field, fresh = false, error, below, children }: WallSlotProps) {
  // Alternating 8px offsets in the single column only.
  const offset = index % 2 === 0 ? 'mr-2 min-[480px]:mr-0' : 'ml-2 min-[480px]:ml-0';
  return (
    <li data-field={field} className={offset}>
      <div className="wall-tile" data-fresh={fresh} style={{ '--tilt': `${tiltFor(index)}deg` } as CSSProperties}>
        {children}
      </div>
      {below}
      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-error">
          <AlertIcon className="mt-[3px] h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </li>
  );
}

const TILE_BUTTON = 'block w-full rounded-sm border-2 border-ink p-4 text-left';

/** APP-04-R2: dashed outline, a plus and a prompt. Never a generic dropzone (R5). */
export function EmptyTile({ prompt, hint, onOpen }: { prompt: string; hint?: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`${TILE_BUTTON} min-h-[112px] border-dashed bg-transparent`}>
      <span className="block font-display text-xl leading-tight">{prompt}</span>
      {hint && <span className="mt-2 block text-sm text-muted">{hint}</span>}
    </button>
  );
}

/** APP-04-R1: service glyph, hostname and a shortened path. */
export function LinkTile({ label, link, onOpen }: { label: string; link: LinkParts; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={fmt(copy.work.linkTile, { label, link: `${link.host}${link.path}` })}
      className={`${TILE_BUTTON} flex items-center gap-4 bg-yellow`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-paper">
        <ServiceGlyph service={link.service} className="h-7 w-7" />
      </span>
      <span className="min-w-0">
        <span className="block break-words font-display text-lg leading-tight">{link.host}</span>
        {link.path && <span className="block break-all text-sm">{link.path}</span>}
      </span>
    </button>
  );
}

/** APP-04-R1: an index card, title on top and the description under it. */
export function ProudTile({ n, title, description, onOpen }: { n: number; title: string; description: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={fmt(copy.work.proudTile, { n: String(n), title })}
      className={`${TILE_BUTTON} border-t-[10px] border-t-cobalt bg-paper`}
    >
      <span className="block break-words font-display text-lg leading-tight">{title}</span>
      <span className="mt-2 block whitespace-pre-line break-words border-t-2 border-ink pt-2 text-sm leading-relaxed">
        {description}
      </span>
    </button>
  );
}
