// SHL-01 to SHL-06: the frame around every /apply/* screen. Clean and playful mode (DSN-02).
// The progress bar lives here rather than in each step, so it persists between steps and can animate
// a stage completing (stamp) and the next one becoming current (pop).
import { startTransition, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { JOIN_PATH, copy } from '@andropedia/shared';
import { ProgressBar } from '../../components/ProgressBar';
import { useConfig } from '../../state/config';
import { useDraft } from '../../state/draft';
import { DraftBanner } from './DraftBanner';
import { isGuardState, useRouteGuard } from './guard';
import { DONE_PATH, STEPS, progressFor } from './steps';

export default function ApplyShell() {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const allowed = useRouteGuard();
  const config = useConfig();
  const { data, submissionId, draftNoticeOpen, closeDraftNotice, clearDraft } = useDraft();
  const onDone = pathname === DONE_PATH;

  // LND-08: a closed round sends anyone mid-form back to the landing page, which shows the closed message.
  const closed = config?.recruitmentOpen === false;
  useEffect(() => {
    if (closed && !onDone) navigate(JOIN_PATH, { replace: true });
  }, [closed, onDone, navigate]);

  // The restored-draft banner belongs to the first screen shown; moving to any other step dismisses it.
  const firstPath = useRef<string | null>(null);
  useEffect(() => {
    if (!allowed) return;
    firstPath.current ??= pathname;
    if (pathname !== firstPath.current) closeDraftNotice();
  }, [allowed, pathname, closeDraftNotice]);

  if (!allowed || (closed && !onDone)) return null;

  const { states, parts } = progressFor(pathname, data, Boolean(submissionId));
  // The band color follows the current stage; the success screen is the last (green) stage.
  const stage = onDone ? states.length - 1 : Math.max(0, states.indexOf('current'));

  const startOver = () => {
    // Every later step needs step 01, so starting over always lands there (SHL-05).
    // One transition, because the router commits navigations as transitions: clearing first on its own
    // would let the guard see an empty draft on a later step and redirect with the "finish this step" alert.
    startTransition(() => {
      clearDraft();
      if (pathname !== STEPS[0]!.path) navigate(STEPS[0]!.path, { replace: true });
    });
    // The banner (and the Start over button that opened the dialog) is gone, so focus goes to the step title.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1')?.focus());
  };

  return (
    // overflow-x: clip keeps the full-width stage band from adding a horizontal scrollbar.
    <div className="apply-shell overflow-x-clip" data-stage={stage}>
      <div className="gutter mx-auto w-full max-w-[720px] pb-[max(4rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="on-band">
          <ProgressBar states={states} parts={parts} celebrate={onDone && Boolean(submissionId)} />

          {draftNoticeOpen && !onDone && <DraftBanner onReset={startOver} />}

          {isGuardState(state) && (
            <p role="alert" className="mt-5 rounded-sm border-2 border-ink bg-orange px-4 py-3 font-semibold text-ink">
              {copy.shell.guarded}
            </p>
          )}
        </div>

        <main className="mt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
