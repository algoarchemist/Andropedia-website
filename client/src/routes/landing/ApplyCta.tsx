// LND-06 / LND-08: the page's one Apply now, or the closed notice when recruitment is closed. The button sits raised
// on a flat ink block (DSN-06 allows no shadows): hover lifts it, press pushes it onto the block (`.cta-lift`).
import { copy } from '@andropedia/shared';
import { Button } from '../../components/Button';
import { ArrowIcon } from '../../icons/ui';
import { useConfig } from '../../state/config';

type ApplyCtaProps = { onApply: () => void; className?: string; variant?: 'primary' | 'secondary' };

/** `secondary` (paper) is for the red band, where the red primary button would disappear. */
export function ApplyCta({ onApply, className = '', variant = 'primary' }: ApplyCtaProps) {
  const config = useConfig();

  // Reserve the button's height while the config loads so the page does not jump.
  if (!config) return <div className={`min-h-[76px] ${className}`} aria-hidden="true" />;

  if (!config.recruitmentOpen) {
    return (
      <p className={`rounded-sm border-2 border-current px-4 py-3 font-display text-lg leading-tight ${className}`}>
        {copy.closed.body}
      </p>
    );
  }

  return (
    <span className={`relative inline-block w-full sm:w-auto ${className}`}>
      <span aria-hidden="true" className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-sm bg-ink" />
      <Button onClick={onApply} variant={variant} className="cta-lift group relative w-full gap-3 px-10 py-6 text-2xl sm:w-auto">
        {copy.cta.apply}
        <ArrowIcon className="h-6 w-6 shrink-0 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </Button>
    </span>
  );
}
