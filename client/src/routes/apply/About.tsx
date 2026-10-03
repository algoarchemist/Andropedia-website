// Step 03, stage 02 part b (APP-03). The helper line sits directly under the title (OD-07).
import { DOMAINS, copy, fmt } from '@andropedia/shared';
import { LongTextField } from '../../components/LongTextField';
import { StepLayout } from '../../components/StepLayout';
import { TagInput } from '../../components/TagInput';
import { useDraft } from '../../state/draft';
import { stepById } from './steps';

const step = stepById('about');

export default function About() {
  const { data, setData } = useDraft();
  // OD-06: the label names the applicant's first pick. The guard guarantees one exists.
  const domainName = DOMAINS.find((d) => d.id === data.domainPref1)?.name ?? '';

  return (
    <StepLayout step={step} helper={copy.about.notFound}>
      <div className="space-y-6">
        <LongTextField name="aboutYou" label={copy.about.self} />
        <LongTextField name="whyDomain" label={fmt(copy.about.whyDomain, { domain: domainName })} />
        <LongTextField name="skills" label={copy.about.skills} helper={copy.about.skillsHelp} />
        <TagInput
          name="techStack"
          label={copy.about.stack}
          helper={copy.about.stackHelp}
          tags={data.techStack ?? []}
          onChange={(techStack) => setData({ techStack })}
        />
        <LongTextField name="outsideAcademics" label={copy.about.outside} helper={copy.about.outsideHelp} />
        <LongTextField name="whyAndropedia" label={copy.about.whyClub} />
        <LongTextField name="oneYearVision" label={copy.about.oneYear} />
      </div>
    </StepLayout>
  );
}
