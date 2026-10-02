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

/** Flat 8 point burst used as the stamp on the final process step. */
export function BurstIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d="M12 1l2.6 4.7L19.5 4.5l-1.2 5L23 12l-4.7 2.5 1.2 5-4.9-1.2L12 23l-2.6-4.7-4.9 1.2 1.2-5L1 12l4.7-2.5-1.2-5 4.9 1.2z" />
    </svg>
  );
}
