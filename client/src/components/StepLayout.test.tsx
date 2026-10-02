// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY, copy } from '@andropedia/shared';
import { stepById, type StepId } from '../routes/apply/steps';
import { DraftProvider, type DraftData } from '../state/draft';
import { validYou } from '../test/fixtures';
import { StepLayout, useStepErrors } from './StepLayout';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

/** Two stand-in fields that show their error inline, the way Phase 5 fields will. */
function Fields() {
  const errors = useStepErrors();
  return (
    <>
      {(['name', 'registerNumber'] as const).map((path) => (
        <div key={path} data-field={path}>
          <input aria-label={path} />
          {errors[path] && <p>{errors[path]}</p>}
        </div>
      ))}
    </>
  );
}

function renderStep(id: StepId, draft: DraftData = {}, onNext?: () => boolean | Promise<boolean>) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  const step = stepById(id);
  return render(
    <MemoryRouter initialEntries={[step.path]}>
      <DraftProvider>
        <Routes>
          <Route
            path={step.path}
            element={
              <StepLayout step={step} onNext={onNext}>
                <Fields />
              </StepLayout>
            }
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </DraftProvider>
    </MemoryRouter>,
  );
}

const next = () => screen.getByRole('button', { name: copy.nav.next });
const back = () => screen.getByRole('button', { name: copy.nav.back });

describe('StepLayout (SHL-02)', () => {
  it('renders the step title, then Next and Back in normal flow', () => {
    renderStep('you');
    expect(screen.getByRole('heading', { level: 1, name: copy.you.title })).toBeTruthy();
    expect(next().getAttribute('type')).toBe('submit');
    expect(back().getAttribute('type')).toBe('button');
    // Neither button, nor anything around them, is fixed to the viewport.
    expect(document.querySelector('.fixed, .sticky')).toBeNull();
  });

  it('sets the document title to Step 0X · Andropedia Recruitment (SHL-06)', () => {
    renderStep('about');
    expect(document.title).toBe('Step 03 · Andropedia Recruitment');
  });

  it('Back from step 01 goes to the landing page', async () => {
    const user = userEvent.setup();
    renderStep('you');
    await user.click(back());
    expect(screen.getByTestId('where').textContent).toBe('/');
  });

  it('Back from a later step goes to the previous step', async () => {
    const user = userEvent.setup();
    renderStep('work');
    await user.click(back());
    expect(screen.getByTestId('where').textContent).toBe('/apply/about');
  });
});

describe('Next (SHL-03)', () => {
  it('validates the step schema: inline errors from err.* copy, first invalid field focused and shaken', async () => {
    const user = userEvent.setup();
    renderStep('you', { name: 'Asha Rao', registerNumber: 'RA123' });
    await user.click(next());

    expect(screen.queryByTestId('where')).toBeNull(); // stayed on the step
    expect(screen.getByText(copy.err.regno)).toBeTruthy();
    const regno = screen.getByLabelText('registerNumber');
    expect(document.activeElement).toBe(regno);
    expect(regno.parentElement!.classList.contains('shake')).toBe(true);
  });

  it('goes to the next step when the schema passes', async () => {
    const user = userEvent.setup();
    renderStep('you', validYou);
    await user.click(next());
    expect(screen.getByTestId('where').textContent).toBe('/apply/domain');
  });

  it('submits from the keyboard (Enter in a field)', async () => {
    const user = userEvent.setup();
    renderStep('you', validYou);
    await user.type(screen.getByLabelText('name'), '{Enter}');
    expect(screen.getByTestId('where').textContent).toBe('/apply/domain');
  });

  it('runs onNext after the schema passes and stays when it returns false', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn(async () => false);
    renderStep('you', validYou, onNext);
    await user.click(next());
    expect(onNext).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('does not call onNext while the step is invalid', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn(() => true);
    renderStep('you', {}, onNext);
    await user.click(next());
    expect(onNext).not.toHaveBeenCalled();
  });
});
