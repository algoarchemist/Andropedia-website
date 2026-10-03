// Step 06, stage 05 (APP-06). A live word counter (R1) and the submit (R2) with every outcome:
// 201 done, 409 duplicate, 400 back to the step that owns the error, network failure with retry, 403 closed.
import { startTransition, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LIMITS, copy, countWords } from '@andropedia/shared';
import { ApiError, submitApplication } from '../../api/api';
import { Field, FieldError, CONTROL_CLASS } from '../../components/Field';
import { StepLayout } from '../../components/StepLayout';
import { useDraftText } from '../../hooks';
import { useDraft, type DraftData } from '../../state/draft';
import type { ServerErrorState } from './guard';
import { DONE_PATH, stepById, stepForField } from './steps';

const step = stepById('last');

type Failure = { message: string; retry?: boolean };

/** The API-04 payload: the draft without the display-only photoUrl, plus the honeypot. */
export function toPayload(data: DraftData, website: string): Record<string, unknown> {
  const { photoUrl: _photoUrl, ...payload } = data;
  return { ...payload, website };
}

export default function Last() {
  const navigate = useNavigate();
  const { data, clearDraft, setSubmissionId, setSubmittedFirstName } = useDraft();
  const [answer, setAnswer] = useDraftText('rememberUs');
  const [failure, setFailure] = useState<Failure>();
  const honeypot = useRef<HTMLInputElement>(null);

  const words = countWords(answer);
  const over = words > LIMITS.rememberWordsMax;

  async function submit(): Promise<boolean> {
    setFailure(undefined);
    try {
      const { id } = await submitApplication(toPayload(data, honeypot.current?.value ?? ''));
      const firstName = (data.name ?? '').trim().split(/\s+/)[0];
      // One transition: the guard must never see an empty draft on this step before the route is /apply/done.
      startTransition(() => {
        setSubmissionId(id);
        setSubmittedFirstName(firstName || undefined);
        clearDraft();
        navigate(DONE_PATH, { replace: true });
      });
      return false; // already navigated
    } catch (err) {
      if (!(err instanceof ApiError) || err.status === 0) {
        setFailure({ message: copy.err.network, retry: true });
      } else if (err.status === 409) {
        setFailure({ message: copy.err.duplicate });
      } else if (err.status === 403) {
        setFailure({ message: copy.closed.body });
      } else if (err.status === 400) {
        sendToOwningStep(err);
      } else {
        setFailure({ message: err.message, retry: err.status >= 500 });
      }
      return false;
    }
  }

  /** APP-06-R2 400: open the step that owns the first invalid field, with the server's errors shown there. */
  function sendToOwningStep(err: ApiError) {
    const owner = err.errors.map((e) => stepForField(e.path)).find(Boolean);
    if (!owner || owner.id === step.id) {
      setFailure({ message: err.errors[0]?.message ?? copy.err.server });
      return;
    }
    const serverErrors = Object.fromEntries(
      err.errors.filter((e) => stepForField(e.path)?.id === owner.id).map((e) => [e.path, e.message]),
    );
    navigate(owner.path, { state: { serverErrors } satisfies ServerErrorState });
  }

  return (
    <StepLayout
      step={step}
      onNext={submit}
      nextLabel={copy.last.submit}
      busyLabel={copy.last.sending}
      nextDisabled={over}
    >
      <p className="text-lg">{copy.last.intro}</p>
      <div className="mt-6">
        <Field
          name="rememberUs"
          label={copy.last.remember}
          // R1: over 30 words is shown at once, in red, without blocking typing.
          error={over ? copy.err.words : undefined}
          counter={{ length: words, max: LIMITS.rememberWordsMax, always: true }}
        >
          {({ labelId: _labelId, ...control }) => (
            <textarea
              {...control}
              value={answer}
              rows={3}
              maxLength={LIMITS.longTextMax}
              autoCapitalize="sentences"
              onChange={(e) => setAnswer(e.target.value)}
              className={`${CONTROL_CLASS} min-h-[104px] resize-y leading-normal`}
            />
          )}
        </Field>
      </div>

      {/* SEC-04 honeypot: off screen, out of the tab order and hidden from assistive tech. People never fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          {copy.last.honeypot}
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {failure && (
        <div role="alert" className="mt-6">
          <FieldError message={failure.message} />
          {failure.retry && (
            <button
              type="button"
              onClick={(e) => e.currentTarget.form?.requestSubmit()}
              className="mt-3 min-h-[44px] rounded-sm border-2 border-ink bg-paper px-4 font-semibold"
            >
              {copy.last.retry}
            </button>
          )}
        </div>
      )}
    </StepLayout>
  );
}
