// Step 02, stage 02 part a (APP-02). Both preferences are required (OD-03) and must differ.
import { useState } from 'react';
import { copy } from '@andropedia/shared';
import { DomainPicker } from '../../components/DomainPicker';
import { StepLayout } from '../../components/StepLayout';
import { useDraft } from '../../state/draft';
import { stepById } from './steps';

const step = stepById('domain');

export default function Domain() {
  const { data, setData } = useDraft();
  const pref1 = data.domainPref1 ?? '';
  const pref2 = data.domainPref2 ?? '';
  // APP-02-R1: shown under Preference 2 after it was cleared because Preference 1 took its value.
  const [pref2WasReset, setPref2WasReset] = useState(false);

  return (
    <StepLayout step={step}>
      <div className="space-y-6">
        <DomainPicker
          name="domainPref1"
          label={copy.domain.pref1}
          value={pref1}
          onChange={(next) => {
            const clash = pref2 === next;
            setData(clash ? { domainPref1: next, domainPref2: '' } : { domainPref1: next });
            setPref2WasReset(clash);
          }}
        />
        <DomainPicker
          name="domainPref2"
          label={copy.domain.pref2}
          value={pref2}
          exclude={pref1 ? [pref1] : []}
          error={pref2WasReset && !pref2 ? copy.domain.pref2Reset : undefined}
          onChange={(next) => {
            setPref2WasReset(false);
            setData({ domainPref2: next });
          }}
        />
      </div>
    </StepLayout>
  );
}
