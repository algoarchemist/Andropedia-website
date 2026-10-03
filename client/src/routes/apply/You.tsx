// Step 01, stage 01 (APP-01). Back returns to the landing page (SHL-02).
// APP-01-R1: Next also asks API-02 whether the register number or email has already applied.
import { useEffect, useState } from 'react';
import { DEPARTMENTS, INPUT_MAX, PHONE_PREFIX, copy, youSchema } from '@andropedia/shared';
import { ApiError, checkDuplicate } from '../../api/api';
import { SelectField } from '../../components/SelectField';
import { StepLayout, focusFirstInvalid } from '../../components/StepLayout';
import { TextField } from '../../components/TextField';
import { AlertIcon } from '../../icons/ui';
import { useDraft } from '../../state/draft';
import { stepById } from './steps';

const step = stepById('you');

const toUpper = (v: string) => v.toUpperCase();
/** Digits only; a pasted +91 / 91 prefix is dropped when a full 10 digit number follows it. */
const toPhoneDigits = (v: string) => {
  const digits = v.replace(/\D/g, '');
  const local = digits.length > INPUT_MAX.phoneDigits && digits.startsWith('91') ? digits.slice(2) : digits;
  return local.slice(0, INPUT_MAX.phoneDigits);
};

type Taken = { registerNumber?: boolean; email?: boolean };

export default function You() {
  const { data, setData } = useDraft();
  const [taken, setTaken] = useState<Taken>({});
  const [failure, setFailure] = useState<string>();
  // Bumped per blocked Next, so a second blocked attempt shakes again.
  const [blocked, setBlocked] = useState(0);

  useEffect(() => {
    if (!blocked) return;
    const paths = (['registerNumber', 'email'] as const).filter((k) => taken[k]);
    focusFirstInvalid(document.querySelector('form'), paths);
    // Only a new blocked attempt moves focus, not later edits that clear one of the flags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  async function onNext() {
    setFailure(undefined);
    // The server compares normalised values, so send what the schema produces (uppercase, lowercase).
    const { registerNumber, email } = youSchema.parse(data);
    try {
      const result = await checkDuplicate(registerNumber, email);
      if (!result.registerNumberTaken && !result.emailTaken) {
        setTaken({});
        return true;
      }
      setTaken({ registerNumber: result.registerNumberTaken, email: result.emailTaken });
      setBlocked((n) => n + 1);
      return false;
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : copy.err.network);
      return false;
    }
  }

  const clearTaken = (key: keyof Taken) => () => setTaken((t) => (t[key] ? { ...t, [key]: false } : t));

  return (
    <StepLayout step={step} onNext={onNext}>
      <div className="space-y-6">
        <TextField
          name="name"
          label={copy.you.name}
          autoComplete="name"
          autoCapitalize="words"
          maxLength={INPUT_MAX.name}
        />
        <TextField
          name="registerNumber"
          label={copy.you.regno}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={INPUT_MAX.registerNumber}
          clean={toUpper}
          error={taken.registerNumber ? copy.err.duplicate : undefined}
          onValue={clearTaken('registerNumber')}
        />
        <TextField
          name="email"
          label={copy.you.email}
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          error={taken.email ? copy.err.duplicate : undefined}
          onValue={clearTaken('email')}
        />
        <TextField
          name="phone"
          label={copy.you.phone}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          prefix={{ text: PHONE_PREFIX, label: copy.you.phonePrefix }}
          clean={toPhoneDigits}
        />
        <SelectField
          name="department"
          label={copy.you.department}
          value={data.department ?? ''}
          onChange={(department) => setData({ department })}
          prompt={copy.you.departmentPrompt}
          options={DEPARTMENTS}
        />
        <TextField
          name="section"
          label={copy.you.section}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={INPUT_MAX.section}
          clean={toUpper}
        />
      </div>

      {failure && (
        <p role="alert" className="mt-6 flex items-start gap-2 font-semibold text-error">
          <AlertIcon className="mt-1 h-4 w-4 shrink-0" />
          <span>{failure}</span>
        </p>
      )}
    </StepLayout>
  );
}

