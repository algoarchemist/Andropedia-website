// LND-02 / LND-06 / LND-08: Apply now, or the closed notice when recruitment is closed.
import { copy } from '@andropedia/shared';
import { Button } from '../../components/Button';
import { useConfig } from '../../state/config';

type ApplyCtaProps = { onApply: () => void; className?: string; variant?: 'primary' | 'secondary' };

/** `secondary` (paper) is for the red band, where the red primary button would disappear. */
export function ApplyCta({ onApply, className = '', variant = 'primary' }: ApplyCtaProps) {
  const config = useConfig();

  // Reserve the button's height while the config loads so the page does not jump.
  if (!config) return <div className={`min-h-[56px] ${className}`} aria-hidden="true" />;

  if (!config.recruitmentOpen) {
    return (
      <p className={`rounded-sm border-2 border-current px-4 py-3 font-display text-lg leading-tight ${className}`}>
        {copy.closed.body}
      </p>
    );
  }

  return (
    <Button onClick={onApply} variant={variant} className={`w-full sm:w-auto ${className}`}>
      {copy.cta.apply}
    </Button>
  );
}
