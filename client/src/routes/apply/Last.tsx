// Step 06, stage 05. Submit (API-04) arrives in Phase 7; until then a valid Next stays here.
import { StepPlaceholder } from './StepPlaceholder';

const noSubmitYet = () => false;

export default function Last() {
  return <StepPlaceholder id="last" phase={7} onNext={noSubmitYet} />;
}
