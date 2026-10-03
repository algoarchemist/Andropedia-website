// @vitest-environment jsdom
// Owner request: a check stamps in beside a field's label once it is left with a valid value (and the stage numeral).
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copy } from '@andropedia/shared';
import { resetConfigCache } from '../state/config';
import { validYou } from '../test/fixtures';
import { renderApply } from '../test/renderApply';

beforeEach(() => {
  resetConfigCache();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ recruitmentOpen: true, whatsappUrl: '' }))));
});
afterEach(() => vi.unstubAllGlobals());

const stampOn = (field: string) => document.querySelector(`[data-field="${field}"] [data-done-stamp]`);

describe('per-field stamp', () => {
  it('stamps a field only after it is left with a valid value', async () => {
    const user = userEvent.setup();
    renderApply('/apply/you');
    const name = screen.getByLabelText(copy.you.name);
    await user.type(name, 'Asha Rao');
    expect(stampOn('name')).toBeNull(); // still typing
    await user.tab();
    expect(stampOn('name')).not.toBeNull();
    // The stamp is decoration: the label's accessible name is unchanged.
    expect(screen.getByLabelText(copy.you.name)).toBe(name);
  });

  it('does not stamp an invalid or an empty field', async () => {
    const user = userEvent.setup();
    renderApply('/apply/you');
    await user.type(screen.getByLabelText(copy.you.email), 'nope');
    await user.tab();
    expect(stampOn('email')).toBeNull();
    await user.click(screen.getByLabelText(copy.you.section));
    await user.tab();
    expect(stampOn('section')).toBeNull();
  });

  it('the domain picker keeps its own stamp, not a second one', () => {
    renderApply('/apply/domain', { ...validYou, domainPref1: 'TECHNICAL' });
    expect(stampOn('domainPref1')).toBeNull();
  });

  it('shows the stage number, as a faint watermark, behind the step title', () => {
    renderApply('/apply/about', { ...validYou, domainPref1: 'TECHNICAL', domainPref2: 'DESIGN' });
    const numeral = document.querySelector('.stage-numeral');
    expect(numeral?.textContent).toBe('02');
    expect(numeral?.getAttribute('aria-hidden')).toBe('true');
  });
});
