// A single line text control inside a Field, bound to the draft (APP-00, APP-01).
import type { HTMLInputTypeAttribute, InputHTMLAttributes, ReactNode } from 'react';
import { useDraftText } from '../hooks';
import type { DraftData } from '../state/draft';
import { CONTROL_CLASS, Field } from './Field';

type TextFieldProps = {
  name: keyof DraftData & ('name' | 'registerNumber' | 'email' | 'phone' | 'section');
  label: string;
  type?: HTMLInputTypeAttribute;
  /** Cleans the value as it is typed (uppercase, digits only). The draft stores the cleaned value. */
  clean?: (value: string) => string;
  /** Fixed text shown outside the input, before it (the +91 of APP-01 F4). */
  prefix?: { text: string; label: string };
  error?: string;
  /** Called after every change, for example to drop a stale duplicate error. */
  onValue?: (value: string) => void;
  helper?: ReactNode;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'autoComplete' | 'autoCapitalize' | 'inputMode' | 'maxLength' | 'spellCheck'>;

export function TextField({ name, label, type = 'text', clean, prefix, error, onValue, helper, ...attrs }: TextFieldProps) {
  const [value, setValue] = useDraftText(name);

  return (
    <Field name={name} label={label} helper={helper} error={error}>
      {({ labelId: _labelId, ...control }) => {
        const input = (
          <input
            {...control}
            {...attrs}
            type={type}
            value={value}
            onChange={(e) => {
              const next = clean ? clean(e.target.value) : e.target.value;
              setValue(next);
              onValue?.(next);
            }}
            className={`${CONTROL_CLASS} ${prefix ? 'rounded-l-none' : ''}`}
          />
        );
        if (!prefix) return input;
        return (
          <div className="flex">
            <span
              role="img"
              aria-label={prefix.label}
              className="flex min-h-[52px] items-center rounded-l-sm border-2 border-r-0 border-ink bg-yellow px-3 font-semibold"
            >
              {prefix.text}
            </span>
            {input}
          </div>
        );
      }}
    </Field>
  );
}
