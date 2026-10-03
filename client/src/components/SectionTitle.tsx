// DSN-04 section title size plus the DSN-05 hand-drawn underline.
import type { ReactNode } from 'react';

export function Underline({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`block h-3 w-full max-w-[16rem] ${className}`}
      viewBox="0 0 120 12"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path vectorEffect="non-scaling-stroke" d="M2 7C18 2 34 11 52 6S88 2 100 7s14-1 18-2" />
    </svg>
  );
}

/** `underline` is the hand-drawn line's color class; dark bands use yellow. */
export function SectionTitle({ children, id, underline = 'text-red' }: { children: ReactNode; id?: string; underline?: string }) {
  return (
    <div>
      <h2 id={id} className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[0.95] tracking-[-0.02em]">
        {children}
      </h2>
      <Underline className={`mt-2 ${underline}`} />
    </div>
  );
}
