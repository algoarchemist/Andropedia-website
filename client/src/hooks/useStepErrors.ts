// SHL-03 and APP-00: validation errors for the current step.
// `StepLayout` owns the errors from the last failed Next and the step schema, and provides both here.
// Fields read them through `useStepErrors()` / `useFieldError()`.
import { createContext, useContext, useMemo } from 'react';
import type { ZodError, ZodTypeAny } from 'zod';
import { useDraft, type DraftData } from '../state/draft';

/** Field path (dotted, e.g. `achievements.0.title`) to its first error message. */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    out[path] ??= issue.message;
  }
  return out;
}

/** Validates the whole step against the draft. Empty object when the step is valid. */
export function validateStep(schema: ZodTypeAny, data: DraftData): FieldErrors {
  const result = schema.safeParse(data);
  return result.success ? {} : toFieldErrors(result.error);
}

export const StepErrorsContext = createContext<FieldErrors>({});
export const StepSchemaContext = createContext<ZodTypeAny | null>(null);

/** Errors from the last failed Next, for fields to show inline (SHL-03). */
export const useStepErrors = () => useContext(StepErrorsContext);

/** The current step's errors computed live from the draft (what Next would report right now). */
export function useLiveStepErrors(): FieldErrors {
  const schema = useContext(StepSchemaContext);
  const { data } = useDraft();
  return useMemo(() => (schema ? validateStep(schema, data) : {}), [schema, data]);
}
