// DSN-07: rectangular, 2px ink border, radius 2px, 56px tall. Primary is red with ink text,
// secondary is paper. Press shifts the button 2px down and right (no shadow).
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

const BASE =
  'inline-flex min-h-[56px] items-center justify-center border-2 border-ink px-6 py-3 font-display text-lg uppercase leading-none tracking-[-0.01em] text-ink rounded-sm ' +
  'transition-transform duration-150 active:translate-x-[2px] active:translate-y-[2px] motion-reduce:transition-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-red',
  secondary: 'bg-paper',
};

/** Class string for things that must look like a Button but are not one (for example a router Link). */
export const buttonClass = (variant: Variant = 'primary', extra = '') => `${BASE} ${VARIANTS[variant]} ${extra}`.trim();

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, className)} {...rest} />;
});
