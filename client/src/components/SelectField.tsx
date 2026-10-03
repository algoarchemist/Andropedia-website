// DSN-07 Select: a native <select> (best picker on phones) with a custom chevron and the Field box.
import type { ReactNode } from 'react';
import { ChevronIcon } from '../icons/ui';
import { CONTROL_CLASS, Field } from './Field';

type Option = { id: string; label: string };

type SelectFieldProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  prompt: string;
  options: readonly Option[];
  autoComplete?: string;
  helper?: ReactNode;
};

export function SelectField({ name, label, value, onChange, prompt, options, autoComplete, helper }: SelectFieldProps) {
  return (
    <Field name={name} label={label} helper={helper}>
      {({ labelId: _labelId, ...control }) => (
        <div className="relative">
          <select
            {...control}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${CONTROL_CLASS} appearance-none pr-12 ${value ? '' : 'text-muted'}`}
          >
            <option value="">{prompt}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id} className="text-ink">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2" />
        </div>
      )}
    </Field>
  );
}
