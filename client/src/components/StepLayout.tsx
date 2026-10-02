// SHL-02 step layout: title in display type, optional helper line, fields, then Next and Back in normal
// document flow (never fixed to the viewport bottom, so the mobile keyboard cannot cover them).
// SHL-03: Next validates the whole step; on failure the first invalid field is scrolled to, focused and shaken.
// SHL-06: on step change, scroll to top and set the document title.
import { createContext, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ZodError } from 'zod';
import { copy, fmt } from '@andropedia/shared';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { cameFrom, type FromState } from '../routes/apply/guard';
import { nextPath, prevPath, type Step } from '../routes/apply/steps';
import { useDraft } from '../state/draft';
import { Button } from './Button';

/** Field path (dotted, e.g. `achievements.0.title`) to its first error message. */
export type FieldErrors = Record<string, string>;

const StepErrorsContext = createContext<FieldErrors>({});

/** Errors from the last failed Next, for fields to show inline (SHL-03). */
export const useStepErrors = () => useContext(StepErrorsContext);

export function toFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    out[path] ??= issue.message;
  }
  return out;
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Fields mark their wrapper with data-field="<path>". Focuses the first invalid one that is on screen,
 * in schema order, scrolls it into view and shakes it once.
 */
export function focusFirstInvalid(root: HTMLElement | null, paths: string[]) {
  if (!root) return;
  const fields = Array.from(root.querySelectorAll<HTMLElement>('[data-field]'));
  for (const path of paths) {
    const field = fields.find((el) => el.dataset.field === path);
    if (!field) continue;
    const control = field.matches('input, select, textarea, button, [tabindex]')
      ? field
      : (field.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]') ?? field);
    field.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    control.focus({ preventScroll: true });
    field.classList.remove('shake');
    void field.offsetWidth; // restart the animation if it is already applied
    field.classList.add('shake');
    field.addEventListener('animationend', () => field.classList.remove('shake'), { once: true });
    return;
  }
}

type StepLayoutProps = {
  step: Step;
  helper?: ReactNode;
  children?: ReactNode;
  /**
   * Extra async work after the step schema passes (for example the duplicate check on step 01).
   * Return false to stay on the step.
   */
  onNext?: () => boolean | Promise<boolean>;
};

export function StepLayout({ step, helper, children, onNext }: StepLayoutProps) {
  const navigate = useNavigate();
  const { key, state } = useLocation();
  const { data } = useDraft();
  const [errors, setErrors] = useState<FieldErrors>({});
  // A new object on every failed Next, so the same errors twice still refocus and shake,
  // while other error updates (such as on-blur checks) never move focus.
  const [focusRequest, setFocusRequest] = useState<{ paths: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useDocumentTitle(fmt(copy.shell.docTitle, { n: step.n }));

  useEffect(() => {
    window.scrollTo(0, 0);
    // After an in-app navigation, move focus to the new step's title so screen readers announce it.
    if (key !== 'default') titleRef.current?.focus({ preventScroll: true });
  }, [step.id, key]);

  // After the errors render, so fields that only show markup when invalid can be found.
  useEffect(() => {
    if (focusRequest) focusFirstInvalid(formRef.current, focusRequest.paths);
  }, [focusRequest]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    const result = step.schema.safeParse(data);
    if (!result.success) {
      const next = toFieldErrors(result.error);
      setErrors(next);
      setFocusRequest({ paths: Object.keys(next) });
      return;
    }
    setErrors({});

    if (onNext) {
      setBusy(true);
      try {
        if (!(await onNext())) return;
      } finally {
        setBusy(false);
      }
    }
    navigate(nextPath(step), { state: { from: step.path } satisfies FromState });
  }

  function handleBack() {
    const target = prevPath(step);
    // Reached from that step with Next: go back through history, so browser forward still works.
    if (cameFrom(state) === target) navigate(-1);
    else navigate(target);
  }

  return (
    <StepErrorsContext.Provider value={errors}>
      <form ref={formRef} noValidate onSubmit={handleSubmit} aria-labelledby={titleId}>
        <h1
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[0.95] tracking-[-0.02em] focus:outline-none"
        >
          {step.title}
        </h1>
        {helper && <p className="mt-3 text-sm text-muted">{helper}</p>}

        <div className="mt-8">{children}</div>

        {/* Next first in the DOM, so it is the first stop after the fields and sits on top when stacked. */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row-reverse sm:justify-between">
          <Button type="submit" aria-busy={busy || undefined} className="w-full sm:w-auto sm:min-w-[11rem]">
            {copy.nav.next}
          </Button>
          <Button variant="secondary" onClick={handleBack} className="w-full sm:w-auto sm:min-w-[11rem]">
            {copy.nav.back}
          </Button>
        </div>
      </form>
    </StepErrorsContext.Provider>
  );
}
