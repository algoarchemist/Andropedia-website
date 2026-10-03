// A textarea for long answers (APP-00): 10 to 1000 characters, counter from 800. Bound to the draft.
// Also used for shorter text with its own max (APP-05 F3b other clubs, 300).
import type { ReactNode } from 'react';
import { LIMITS } from '@andropedia/shared';
import { useDraftText } from '../hooks';
import type { DraftData } from '../state/draft';
import { CONTROL_CLASS, Field } from './Field';

type LongTextFieldProps = {
  name: keyof DraftData & ('aboutYou' | 'whyDomain' | 'skills' | 'outsideAcademics' | 'whyAndropedia' | 'oneYearVision' | 'otherClubs' | 'clubShouldProvide');
  label: ReactNode;
  helper?: ReactNode;
  max?: number;
  rows?: number;
};

export function LongTextField({ name, label, helper, max = LIMITS.longTextMax, rows = 5 }: LongTextFieldProps) {
  const [value, setValue] = useDraftText(name);

  return (
    <Field name={name} label={label} helper={helper} counter={{ length: value.length, max }}>
      {({ labelId: _labelId, ...control }) => (
        <textarea
          {...control}
          value={value}
          rows={rows}
          maxLength={max}
          autoCapitalize="sentences"
          onChange={(e) => setValue(e.target.value)}
          className={`${CONTROL_CLASS} min-h-[140px] resize-y leading-normal`}
        />
      )}
    </Field>
  );
}
