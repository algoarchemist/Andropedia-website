// SHL-03 and APP-00: validation errors for the current step.
// `StepLayout` owns the errors from the last failed Next, any errors the server sent back for this step
// (APP-06-R2 400), and the step schema, and provides all three here. Fields read them through the hooks below.
import { createContext, useContext, useMemo, useState, type FocusEvent } from 'react';
import type { ZodError, ZodTypeAny } from 'zod';
import { useDraft, type DraftData } from '../state/draft';

/** Field path (dotted, e.g. `achievements.0.title`) to its first error message. */
export type FieldErrors = Record<string, string>;

/** A server error together with the value it was about, so it disappears once the user changes that value. */
export type ServerErrors = Record<string, { message: string; value: string }>;

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

/** The draft value at a dotted path, serialised so values of any type compare simply. */
export function draftValueAt(data: DraftData, path: string): string {
  let node: unknown = data;
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return '';
    node = (node as Record<string, unknown>)[key];
  }
  return JSON.stringify(node ?? null);
}

export const StepErrorsContext = createContext<FieldErrors>({});
export const StepSchemaContext = createContext<ZodTypeAny | null>(null);
export const ServerErrorsContext = createContext<ServerErrors>({});

/** Errors from the last failed Next, for fields to show inline (SHL-03). */
export const useStepErrors = () => useContext(StepErrorsContext);

/** The current step's errors computed live from the draft (what Next would report right now). */
export function useLiveStepErrors(): FieldErrors {
  const schema = useContext(StepSchemaContext);
  const { data } = useDraft();
  return useMemo(() => (schema ? validateStep(schema, data) : {}), [schema, data]);
}

/** Server errors at `path` or under it whose value the user has not changed since. */
export function useServerError(path: string): string | undefined {
  const server = useContext(ServerErrorsContext);
  const { data } = useDraft();
  for (const [key, { message, value }] of Object.entries(server)) {
    if ((key === path || key.startsWith(`${path}.`)) && draftValueAt(data, key) === value) return message;
  }
  return undefined;
}

/**
 * What a field shows (APP-00, SHL-03): a forced error first (duplicate check, domain reset), then a server
 * error still about the current value, then the schema error once the field was left or Next failed.
 * Spread `onBlur` on the field wrapper; focus moving inside the wrapper does not count as leaving it.
 * `done` (owner request, the per-field stamp): the field was left with a value and nothing wrong with it.
 */
export function useFieldError(name: string, forced?: string) {
  const [touched, setTouched] = useState(false);
  const submitted = useStepErrors();
  const live = useLiveStepErrors();
  const server = useServerError(name);
  const error = forced ?? server ?? (touched || name in submitted ? live[name] : undefined);
  const { data } = useDraft();
  const value = (data as Record<string, unknown>)[name];
  const filled = value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
  const clean = !Object.keys(live).some((key) => key === name || key.startsWith(`${name}.`));
  const done = touched && filled && clean && !forced && !server;

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTouched(true);
  };
  return { error, onBlur, done };
}
