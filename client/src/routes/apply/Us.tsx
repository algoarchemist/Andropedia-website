// Step 05, stage 04 (APP-05). Sliders start unset and only count once moved (DSN-07), so a default is never
// mistaken for an answer. The other clubs list shows only after Yes, and is required then.
import { LIMITS, copy, fmt } from '@andropedia/shared';
import { LongTextField } from '../../components/LongTextField';
import { Slider } from '../../components/Slider';
import { StepLayout } from '../../components/StepLayout';
import { YesNo } from '../../components/YesNo';
import { useDraft } from '../../state/draft';
import { stepById } from './steps';

const step = stepById('us');

// LIMITS.hoursMax renders as 7+ and reads as "7 or more hours a week".
const hoursTick = (n: number) => (n === LIMITS.hoursMax ? copy.us.hoursTickMax : String(n));
const hoursText = (n: number) =>
  n === LIMITS.hoursMax ? copy.us.hoursMaxValue : n === 1 ? copy.us.hoursOne : fmt(copy.us.hoursValue, { n: String(n) });

export default function Us() {
  const { data, setData } = useDraft();

  return (
    <StepLayout step={step}>
      <div className="space-y-8">
        <Slider
          name="hoursPerWeek"
          label={copy.us.hours}
          min={LIMITS.hoursMin}
          max={LIMITS.hoursMax}
          value={data.hoursPerWeek}
          onChange={(hoursPerWeek) => setData({ hoursPerWeek })}
          tickLabel={hoursTick}
          valueText={hoursText}
        />
        <Slider
          name="responsibility"
          label={copy.us.responsibility}
          min={LIMITS.responsibilityMin}
          max={LIMITS.responsibilityMax}
          value={data.responsibility}
          onChange={(responsibility) => setData({ responsibility })}
          valueText={(n) => fmt(copy.us.respValue, { n: String(n) })}
          endLabels={[copy.us.respLow, copy.us.respHigh]}
        />
        <YesNo
          name="inOtherClub"
          legend={copy.us.otherClub}
          value={data.inOtherClub}
          // No clears the list, so a hidden answer is never sent.
          onChange={(inOtherClub) => setData(inOtherClub ? { inOtherClub } : { inOtherClub, otherClubs: '' })}
        />
        {data.inOtherClub === true && (
          <LongTextField name="otherClubs" label={copy.us.otherClubList} max={LIMITS.otherClubsMax} rows={3} />
        )}
        <LongTextField name="clubShouldProvide" label={copy.us.goodClub} />
      </div>
    </StepLayout>
  );
}
