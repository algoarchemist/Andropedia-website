// SHL-02 step layout: title in display type, optional helper line, fields, then Next and Back in normal
// document flow (never fixed to the viewport bottom, so the mobile keyboard cannot cover them).
// SHL-03: Next validates the whole step; on failure the first invalid field is scrolled to, focused and shaken.
// SHL-06: on step change, scroll to top and set the document title.
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PROGRESS_STAGES, copy, fmt } from '@andropedia/shared';
import {
  ServerErrorsContext,
  StepErrorsContext,
  StepSchemaContext,
  draftValueAt,
  toFieldErrors,
  type FieldErrors,
  type ServerErrors,
} from '../hooks';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { cameFrom, serverErrorsFrom, type FromState } from '../routes/apply/guard';
import { nextPath, prevPath, type Step } from '../routes/apply/steps';
import { useDraft } from '../state/draft';
import { Button } from './Button';
import { StageNumeral } from './StageNumeral';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export { useStepErrors } from '../hooks';

/**
 * Fields mark their wrapper with data-field="<path>". Focuses the first invalid one in screen order,
 * scrolls it into view and shakes it once.
 */
export function focusFirstInvalid(root: HTMLElement | null, paths: string[]) {
  if (!root) return;
  // Screen order, not schema order: the first invalid field the user sees (the wall puts the photo first).
  // A field matches its own path or owns a child path (a wall tile `achievements.0` owns `achievements.0.title`).
  const owns = (el: HTMLElement) => paths.some((p) => p === el.dataset.field || p.startsWith(`${el.dataset.field}.`));
  for (const field of Array.from(root.querySelectorAll<HTMLElement>('[data-field]'))) {
    if (!owns(field)) continue;
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
   * Extra async work after the step schema passes (the duplicate check on step 01, the submit on step 06).
   * Return false to stay on the step.
   */
  onNext?: () => boolean | Promise<boolean>;
  /** Label of the primary button (step 06 says Submit application). Defaults to Next. */
  nextLabel?: string;
  /** Shown on the primary button while onNext runs (step 06: Sending it to the core team...). */
  busyLabel?: string;
  /** APP-06-R1: Submit is disabled while the answer is over 30 words. */
  nextDisabled?: boolean;
};

export function StepLayout({ step, helper, children, onNext, nextLabel, busyLabel, nextDisabled = false }: StepLayoutProps) {
  const navigate = useNavigate();
  const { key, state } = useLocation();
  const { data } = useDraft();
  const [errors, setErrors] = useState<FieldErrors>({});

  // APP-06-R2 400: a rejected submit lands here with the server's errors for this step. Each is kept with the
  // value it was about, so it disappears as soon as the user changes that value.
  const [serverErrors] = useState<ServerErrors>(() => {
    const out: ServerErrors = {};
    for (const [path, message] of Object.entries(serverErrorsFrom(state) ?? {})) {
      out[path] = { message, value: draftValueAt(data, path) };
    }
    return out;
  });

  // A new object on every failed Next, so the same errors twice still refocus and shake,
  // while other error updates (such as on-blur checks) never move focus.
  const [focusRequest, setFocusRequest] = useState<{ paths: string[] } | null>(() => {
    const paths = Object.keys(serverErrors);
    return paths.length ? { paths } : null;
  });
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
  // Declared after the title effect, so server errors on arrival win over focusing the title.
  useEffect(() => {
    if (focusRequest) focusFirstInvalid(formRef.current, focusRequest.paths);
  }, [focusRequest]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || nextDisabled) return;

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
    <StepSchemaContext.Provider value={step.schema}>
      <StepErrorsContext.Provider value={errors}>
        <ServerErrorsContext.Provider value={serverErrors}>
          <form ref={formRef} noValidate onSubmit={handleSubmit} aria-labelledby={titleId}>
            <div className="step-head on-band">
              <h1
                ref={titleRef}
                id={titleId}
                tabIndex={-1}
                className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[0.95] tracking-[-0.02em] focus:outline-none"
              >
                {step.title}
              </h1>
              {helper && <p className="mt-3 text-sm">{helper}</p>}
              <StageNumeral n={PROGRESS_STAGES[step.stage]!.n} />
            </div>

            <div className="mt-8">{children}</div>

            {/* Next first in the DOM, so it is the first stop after the fields and sits on top when stacked. */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row-reverse sm:justify-between">
              <Button
                type="submit"
                disabled={nextDisabled || undefined}
                aria-busy={busy || undefined}
                className="w-full disabled:cursor-not-allowed disabled:border-muted disabled:bg-paper disabled:text-muted sm:w-auto sm:min-w-[11rem]"
              >
                {busy && busyLabel ? busyLabel : (nextLabel ?? copy.nav.next)}
              </Button>
              <Button variant="secondary" onClick={handleBack} className="w-full sm:w-auto sm:min-w-[11rem]">
                {copy.nav.back}
              </Button>
            </div>
          </form>
        </ServerErrorsContext.Provider>
      </StepErrorsContext.Provider>
    </StepSchemaContext.Provider>
  );
}
