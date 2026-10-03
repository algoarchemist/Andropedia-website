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

/** LND-09: Instagram glyph drawn in our own stroke style (camera body, lens, flash), not the brand's gradient mark. */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <rect x="16" y="6" width="2" height="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** DONE-03: WhatsApp glyph in our stroke style (round bubble with a tail, handset inside), not the official mark. */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" />
      <path
        d="M9.2 7.6c-.5 0-1 .5-1 1.3 0 1.1.7 2.7 2.2 4.2s3.1 2.2 4.2 2.2c.8 0 1.3-.5 1.3-1v-1.1l-1.9-.9-1 1c-.9-.4-2.2-1.7-2.6-2.6l1-1-.9-1.9z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
