// Temporary body for steps whose fields are built in later phases (PRD 14).
// Next still runs the real step schema, so guards and progress can be exercised end to end.
import { useEffect } from 'react';
import { copy, fmt } from '@andropedia/shared';
import { StepLayout, useStepErrors } from '../../components/StepLayout';
import { useDraft } from '../../state/draft';
import { stepById, type StepId } from './steps';

type StepPlaceholderProps = {
  id: StepId;
  phase: number;
  onNext?: () => boolean | Promise<boolean>;
};

export function StepPlaceholder({ id, phase, onNext }: StepPlaceholderProps) {
  const step = stepById(id);
  const { data } = useDraft();

  useEffect(() => {
    // Development aid only. Never shipped: the draft holds personal data.
    if (import.meta.env.DEV) console.debug(`[draft] step ${step.n}`, data);
  }, [step.n, data]);

  return (
    <StepLayout step={step} onNext={onNext}>
      <p className="rounded-sm border-2 border-dashed border-ink px-4 py-6 text-lg font-semibold">
        {fmt(copy.shell.placeholder, { n: step.n, phase: String(phase) })}
      </p>
      <PlaceholderErrors />
    </StepLayout>
  );
}

/** Stand-in for inline field errors until real fields exist: one focusable line per invalid field. */
function PlaceholderErrors() {
  const errors = Object.entries(useStepErrors());
  if (!errors.length) return null;
  return (
    <ul className="mt-6 space-y-2">
      {errors.map(([path, message]) => (
        <li key={path} data-field={path} tabIndex={-1} className="rounded-sm border-2 border-error px-3 py-2 font-semibold text-error">
          {path}: {message}
        </li>
      ))}
    </ul>
  );
}
