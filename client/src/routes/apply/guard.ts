// SHL-05 route guards (PRD section 3).
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDraft, type DraftData } from '../../state/draft';
import { DONE_PATH, STEPS, firstInvalidStep, stepByPath } from './steps';

/** Location state set when a guard sends someone back, so the step can say why. */
export type GuardState = { guarded: true };

export const isGuardState = (state: unknown): state is GuardState =>
  typeof state === 'object' && state !== null && (state as GuardState).guarded === true;

/**
 * Location state set by Next (and the landing page's continue): the path this entry was reached from.
 * Back uses it to step back through real history, so browser back and forward stay in step order (SHL-05).
 */
export type FromState = { from: string };

export const cameFrom = (state: unknown): string | undefined =>
  typeof state === 'object' && state !== null && typeof (state as FromState).from === 'string'
    ? (state as FromState).from
    : undefined;

/** Location state set when a rejected submit (APP-06-R2, 400) sends someone to the step that owns the error. */
export type ServerErrorState = { serverErrors: Record<string, string> };

export function serverErrorsFrom(state: unknown): Record<string, string> | undefined {
  const errors = typeof state === 'object' && state !== null ? (state as Partial<ServerErrorState>).serverErrors : undefined;
  if (typeof errors !== 'object' || errors === null) return undefined;
  return Object.fromEntries(Object.entries(errors).filter(([, m]) => typeof m === 'string'));
}

/**
 * Where a visit to `pathname` must go instead, or null if it may stay.
 * A step needs every earlier step valid. The success screen needs a submission id from this session.
 */
export function guardRedirect(pathname: string, data: DraftData, submissionId: string | undefined): string | null {
  if (pathname === DONE_PATH) return submissionId ? null : '/';
  const step = stepByPath(pathname);
  if (!step) return null;
  const firstInvalid = firstInvalidStep(data);
  return firstInvalid < step.index ? STEPS[firstInvalid]!.path : null;
}

/** Validates the current route against the draft and redirects when it may not be shown. Returns whether it may render. */
export function useRouteGuard(): boolean {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, submissionId } = useDraft();
  const target = guardRedirect(pathname, data, submissionId);

  // A passive effect: React Router ignores navigate() from a layout effect on first render.
  // Nothing flashes in between, since callers render nothing while this returns false.
  useEffect(() => {
    if (!target) return;
    const state: GuardState | undefined = target === '/' ? undefined : { guarded: true };
    navigate(target, { replace: true, state });
  }, [target, navigate]);

  return target === null;
}
