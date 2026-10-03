// APP-05 F3: a yes/no control drawn as two square buttons side by side. Built on native radio inputs inside a
// fieldset, so arrow keys, the group label and the checked state work everywhere without extra ARIA.
import { useId } from 'react';
import { copy } from '@andropedia/shared';
import { useFieldError } from '../hooks';
import { FieldError } from './Field';

type YesNoProps = {
  name: string;
  legend: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
};

const OPTION =
  'flex min-h-[56px] flex-1 cursor-pointer items-center justify-center rounded-sm border-2 border-ink bg-paper font-display text-lg uppercase ' +
  'has-[:checked]:bg-ink has-[:checked]:text-paper ' +
  'has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cobalt';

export function YesNo({ name, legend, value, onChange }: YesNoProps) {
  const uid = useId();
  const errorId = `${uid}-error`;
  const { error, onBlur } = useFieldError(name);

  return (
    <fieldset data-field={name} onBlur={onBlur} aria-describedby={error ? errorId : undefined} className="m-0 border-0 p-0">
      <legend className="block p-0 font-semibold leading-snug">{legend}</legend>
      <div className="mt-2 flex gap-3">
        {([true, false] as const).map((option) => (
          <label key={String(option)} className={`${OPTION} ${error ? 'border-error' : ''}`}>
            <input
              type="radio"
              name={`${uid}-${name}`}
              className="sr-only"
              checked={value === option}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(option)}
            />
            {option ? copy.us.yes : copy.us.no}
          </label>
        ))}
      </div>
      {error && <FieldError id={errorId} message={error} />}
    </fieldset>
  );
}
