// A textarea for long answers (APP-00): 10 to 1000 characters, counter from 800. Bound to the draft.
import type { ReactNode } from 'react';
import { LIMITS } from '@andropedia/shared';
import { useDraftText } from '../hooks';
import type { DraftData } from '../state/draft';
import { CONTROL_CLASS, Field } from './Field';

type LongTextFieldProps = {
  name: keyof DraftData & ('aboutYou' | 'whyDomain' | 'skills' | 'outsideAcademics' | 'whyAndropedia' | 'oneYearVision');
  label: ReactNode;
  helper?: ReactNode;
};

export function LongTextField({ name, label, helper }: LongTextFieldProps) {
  const [value, setValue] = useDraftText(name);

  return (
    <Field name={name} label={label} helper={helper} counter={{ length: value.length, max: LIMITS.longTextMax }}>
      {({ labelId: _labelId, ...control }) => (
        <textarea
          {...control}
          value={value}
          rows={5}
          maxLength={LIMITS.longTextMax}
          autoCapitalize="sentences"
          onChange={(e) => setValue(e.target.value)}
          className={`${CONTROL_CLASS} min-h-[140px] resize-y leading-normal`}
        />
      )}
    </Field>
  );
}
