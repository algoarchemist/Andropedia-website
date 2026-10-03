// DSN-09: same stroke style as the domain set, 24px grid.
export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

/** Check mark for completed progress stages (SHL-01). */
export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

/** Flat 8 point burst used as the stamp on the final process step. */
export function BurstIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d="M12 1l2.6 4.7L19.5 4.5l-1.2 5L23 12l-4.7 2.5 1.2 5-4.9-1.2L12 23l-2.6-4.7-4.9 1.2 1.2-5L1 12l4.7-2.5-1.2-5 4.9 1.2z" />
    </svg>
  );
}

/** Error marker shown before field error text (DSN-07): a filled square with an exclamation mark. */
export function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="20" height="20" fill="currentColor" />
      <path d="M12 7v6.5M12 16.5v1" stroke="var(--paper)" strokeWidth={3} strokeLinecap="square" fill="none" />
    </svg>
  );
}

/** Select chevron (DSN-07 Select). */
export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 9l7 7 7-7" />
    </svg>
  );
}
