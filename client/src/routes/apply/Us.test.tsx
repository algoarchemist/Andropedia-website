// @vitest-environment jsdom
// Step 05 (APP-05): sliders start unset (DSN-07), the other clubs list is conditional.
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITS, copy } from '@andropedia/shared';
import { resetConfigCache } from '../../state/config';
import { validAbout, validDomain, validUs, validWork, validYou } from '../../test/fixtures';
import { renderApply, storedDraft, where } from '../../test/renderApply';

const before = { ...validYou, ...validDomain, ...validAbout, ...validWork };
const hours = () => screen.getByRole('slider', { name: copy.us.hours });
const resp = () => screen.getByRole('slider', { name: copy.us.responsibility });

beforeEach(() => {
  resetConfigCache();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ recruitmentOpen: true, whatsappUrl: '' }))));
});
afterEach(() => vi.unstubAllGlobals());

describe('step 05: Team and commitment (APP-05)', () => {
  it('sliders start unset: ghost thumb, prompt, read as Not answered', () => {
    renderApply('/apply/us', before);
    expect(hours().getAttribute('aria-valuetext')).toBe(copy.us.notAnswered);
    expect(hours().dataset.unset).toBe('true');
    expect(screen.getAllByText(copy.us.sliderPrompt)).toHaveLength(2);
    expect(hours().getAttribute('min')).toBe(String(LIMITS.hoursMin));
    expect(hours().getAttribute('max')).toBe(String(LIMITS.hoursMax));
    expect(resp().getAttribute('max')).toBe(String(LIMITS.responsibilityMax));
  });

  it('Next with untouched sliders fails, even though the thumb sits on a value', async () => {
    const user = userEvent.setup();
    renderApply('/apply/us', before);
    await user.click(screen.getByRole('button', { name: copy.nav.next }));
    expect(where()).toBe('/apply/us');
    expect(document.activeElement).toBe(hours());
  });

  it('moving a slider answers it and gives a readable value; 7 reads as 7 or more', async () => {
    renderApply('/apply/us', before);
    fireEvent.change(hours(), { target: { value: String(LIMITS.hoursMax) } });
    expect(hours().getAttribute('aria-valuetext')).toBe(copy.us.hoursMaxValue);
    expect(screen.getAllByText(copy.us.hoursTickMax).length).toBeGreaterThan(0);
    fireEvent.change(resp(), { target: { value: '4' } });
    expect(resp().getAttribute('aria-valuetext')).toBe('4 out of 5');
    await waitFor(() => expect(storedDraft().hoursPerWeek).toBe(LIMITS.hoursMax));
    expect(storedDraft().responsibility).toBe(4);
  });

  it('a key press that lands on the ghost value still answers it', () => {
    // jsdom has no range keyboard behaviour; the key leaves the value where it was, as Home at the minimum would.
    renderApply('/apply/us', before);
    fireEvent.keyUp(hours(), { key: 'Home' });
    expect(hours().getAttribute('aria-valuetext')).toBe('0 hours a week');
    expect(hours().dataset.unset).toBe('false');
  });

  it('shows the end labels on the responsibility slider', () => {
    renderApply('/apply/us', before);
    expect(screen.getByText(copy.us.respLow)).toBeTruthy();
    expect(screen.getByText(copy.us.respHigh)).toBeTruthy();
  });

  it('Yes reveals the clubs list, which is then required; No hides and clears it', async () => {
    const user = userEvent.setup();
    renderApply('/apply/us', { ...before, ...validUs });
    expect(screen.queryByLabelText(copy.us.otherClubList)).toBeNull();
    await user.click(screen.getByRole('radio', { name: copy.us.yes }));
    const list = screen.getByLabelText(copy.us.otherClubList);
    expect(list.getAttribute('maxlength')).toBe(String(LIMITS.otherClubsMax));

    await user.click(screen.getByRole('button', { name: copy.nav.next }));
    expect(where()).toBe('/apply/us');
    expect(document.activeElement).toBe(list);

    await user.type(list, 'Coding club');
    await user.click(screen.getByRole('radio', { name: copy.us.no }));
    expect(screen.queryByLabelText(copy.us.otherClubList)).toBeNull();
    await waitFor(() => expect(storedDraft().otherClubs).toBe(''));
  });

  it('a complete step moves on to step 06', async () => {
    const user = userEvent.setup();
    renderApply('/apply/us', { ...before, ...validUs });
    await user.click(screen.getByRole('button', { name: copy.nav.next }));
    expect(where()).toBe('/apply/last');
  });
});
