// LND-07 / DSN-07: a flat, square dialog styled like an old system error box.
// role="alertdialog", traps focus, closes on Esc, close icon and backdrop press, returns focus to the trigger.
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { copy } from '@andropedia/shared';
import { CloseIcon } from '../icons/ui';
import { Button } from './Button';

type ErrorModalProps = {
  onClose: () => void;
  onContinue: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ErrorModal({ onClose, onContinue }: ErrorModalProps) {
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  // Latest onClose for the document listener, without re-running the mount effect (which owns focus return).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // The element that opened the modal gets focus back when it closes.
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    continueRef.current?.focus();

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
            {copy.modal.title}
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
            {copy.modal.body}
          </p>
          <Button ref={continueRef} onClick={onContinue} className="w-full">
            {copy.modal.continue}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
