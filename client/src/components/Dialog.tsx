// DSN-07: a flat, square dialog styled like an old system error box, with an ink title bar.
// role="alertdialog", traps focus, closes on Esc, close icon and backdrop press, returns focus to the trigger.
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { copy } from '@andropedia/shared';
import { CloseIcon } from '../icons/ui';
import { Button } from './Button';

type Action = { label: string; onClick: () => void };

export type DialogProps = {
  title: string;
  body: string;
  primary: Action;
  /** Optional safer choice, shown under the primary. */
  secondary?: Action;
  /** Which button gets focus on open. Destructive confirmations focus the safe one. */
  initialFocus?: 'primary' | 'secondary';
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ title, body, primary, secondary, initialFocus = 'primary', onClose }: DialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const secondaryRef = useRef<HTMLButtonElement>(null);
  // Read once on mount: focus moves in when the dialog opens, not when props change.
  const firstFocusRef = useRef(initialFocus === 'secondary' && secondary ? secondaryRef : primaryRef);

  // Latest onClose for the document listener, without re-running the mount effect (which owns focus return).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // The element that opened the dialog gets focus back when it closes.
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstFocusRef.current.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // On the document, so Esc and the focus trap still work if focus drifts to the page behind.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = Array.from(boxRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      const inside = boxRef.current?.contains(active) ?? false;
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="modal-box w-full max-w-[420px] rounded-sm border-2 border-ink bg-paper"
      >
        <div className="flex items-center justify-between bg-ink py-1 pl-4 pr-1 text-paper">
          <h2 id={titleId} className="font-display text-xl uppercase leading-none">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.modal.close}
            style={{ ['--focus' as string]: 'var(--paper)' }}
            className="flex h-11 w-11 items-center justify-center rounded-sm border-2 border-paper text-paper"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p id={bodyId} className="mb-6 text-lg font-semibold leading-snug">
            {body}
          </p>
          <div className="flex flex-col gap-3">
            <Button ref={primaryRef} onClick={primary.onClick} className="w-full">
              {primary.label}
            </Button>
            {secondary && (
              <Button ref={secondaryRef} variant="secondary" onClick={secondary.onClick} className="w-full">
                {secondary.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
