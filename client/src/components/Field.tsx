// DSN-07 Field: label, control, helper and error slots. Extremely usable mode (DSN-02): no rotation, no offset.
// APP-00: the label is always visible. SHL-03: the wrapper carries data-field so Next can scroll to, focus and shake it.
// Errors show after the field is left (blur) or after a failed Next, then stay live while the user fixes them.
import { useId, useState, type FocusEvent, type ReactNode } from 'react';
import { LIMITS, copy, fmt } from '@andropedia/shared';
import { useLiveStepErrors, useStepErrors } from '../hooks';
import { AlertIcon } from '../icons/ui';

/** DSN-07: 52px tall, 2px ink border, 2px radius. 16px text so iOS does not zoom on focus. Cobalt border on focus. */
export const CONTROL_CLASS =
  'block w-full min-h-[52px] rounded-sm border-2 border-ink bg-paper px-3 py-2 text-base text-ink ' +
  'focus:border-cobalt aria-[invalid=true]:border-error';

/** What a control needs to be wired to its Field. Spread it on the input, select or custom control. */
export type FieldControlProps = {
  id: string;
  name: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
};

type FieldProps = {
  /** Draft key and schema path, e.g. `registerNumber`. Becomes data-field. */
  name: string;
  label: ReactNode;
  helper?: ReactNode;
  /** An error that does not come from the step schema (duplicate check, domain reset). Wins over schema errors. */
  error?: string;
  /** Shows "n / max" once the text reaches LIMITS.longTextCounterFrom (APP-00). */
  counter?: { length: number; max: number };
  children: (control: FieldControlProps & { labelId: string }) => ReactNode;
};

export function Field({ name, label, helper, error: forced, counter, children }: FieldProps) {
  const uid = useId();
  const id = `${uid}-control`;
  const labelId = `${uid}-label`;
  const helperId = `${uid}-helper`;
  const errorId = `${uid}-error`;
  const counterId = `${uid}-counter`;

  const [touched, setTouched] = useState(false);
  const submitted = useStepErrors();
  const live = useLiveStepErrors();
  const error = forced ?? (touched || name in submitted ? live[name] : undefined);

  const showCounter = counter && counter.length >= LIMITS.longTextCounterFrom;
  const describedBy =
    [helper ? helperId : '', showCounter ? counterId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  // Blur from the control or anything inside a custom one; moving focus within the field doesn't count.
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTouched(true);
  };

  return (
    <div data-field={name} onBlur={handleBlur}>
      <label id={labelId} htmlFor={id} className="block font-semibold leading-snug">
        {label}
      </label>
      {helper && (
        <p id={helperId} className="mt-1 text-sm text-muted">
          {helper}
        </p>
      )}
      <div className="mt-2">
        {children({ id, name, labelId, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      </div>
      {showCounter && (
        <p
          id={counterId}
          className={`mt-1 text-right text-sm ${counter.length >= counter.max ? 'font-semibold text-error' : 'text-muted'}`}
        >
          {fmt(copy.field.counter, { n: String(counter.length), max: String(counter.max) })}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 flex items-start gap-2 text-sm font-semibold text-error">
          <AlertIcon className="mt-[3px] h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
