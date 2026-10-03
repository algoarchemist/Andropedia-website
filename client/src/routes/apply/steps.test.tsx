// @vitest-environment jsdom
// Steps 01 to 02b (APP-01 to APP-03): field rules, the duplicate check and the pref 2 exclusion.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOMAINS, DRAFT_KEY, LIMITS, copy, fmt } from '@andropedia/shared';
import { resetConfigCache } from '../../state/config';
import { DraftProvider, type DraftData } from '../../state/draft';
import { validAbout, validDomain, validYou } from '../../test/fixtures';
import ApplyRoutes from './ApplyRoutes';

type Taken = { registerNumberTaken: boolean; emailTaken: boolean };
let taken: Taken;
let checkBody: unknown;

function mockApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/api/applications/check')) {
        checkBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify(taken));
      }
      return new Response(JSON.stringify({ recruitmentOpen: true, whatsappUrl: '' }));
    }),
  );
}

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

function renderApp(path: string, draft: DraftData = {}) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DraftProvider>
        <Routes>
          <Route
            path="/apply/*"
            element={
              <>
                <ApplyRoutes />
                <Where />
              </>
            }
          />
        </Routes>
      </DraftProvider>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;
const aboutBox = () => screen.getByRole('textbox', { name: copy.about.self }); // the form is also named by the same title
const next = () => screen.getByRole('button', { name: copy.nav.next });
const storedDraft = () => JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}') as DraftData;

beforeEach(() => {
  taken = { registerNumberTaken: false, emailTaken: false };
  checkBody = undefined;
  resetConfigCache();
  mockApi();
});
afterEach(() => vi.unstubAllGlobals());

describe('step 01: Who are you? (APP-01)', () => {
  it('has the right input attributes on every field (APP-00)', () => {
    renderApp('/apply/you');
    const name = screen.getByLabelText(copy.you.name);
    expect(name.getAttribute('autocomplete')).toBe('name');
    const regno = screen.getByLabelText(copy.you.regno);
    expect(regno.getAttribute('autocapitalize')).toBe('characters');
    const email = screen.getByLabelText(copy.you.email);
    expect(email.getAttribute('type')).toBe('email');
    const phone = screen.getByLabelText(copy.you.phone);
    expect(phone.getAttribute('type')).toBe('tel');
    expect(phone.getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByLabelText(copy.you.phonePrefix).textContent).toBe('+91');
    expect(screen.getByLabelText(copy.you.section).getAttribute('autocapitalize')).toBe('characters');
    const departments = within(screen.getByLabelText(copy.you.department)).getAllByRole('option');
    expect(departments).toHaveLength(17 + 1); // 17 departments plus the prompt
  });

  it('uppercases the register number and section, keeps only phone digits, and saves to the draft', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you');
    await user.type(screen.getByLabelText(copy.you.regno), 'ra2211003010001');
    await user.type(screen.getByLabelText(copy.you.section), 'a1');
    await user.type(screen.getByLabelText(copy.you.phone), '98a76-5');
    expect((screen.getByLabelText(copy.you.regno) as HTMLInputElement).value).toBe('RA2211003010001');
    expect((screen.getByLabelText(copy.you.phone) as HTMLInputElement).value).toBe('987 65'.replace(' ', ''));
    await waitFor(() => expect(storedDraft().registerNumber).toBe('RA2211003010001'));
    expect(storedDraft().section).toBe('A1');
  });

  it('drops a pasted +91 prefix', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you');
    await user.click(screen.getByLabelText(copy.you.phone));
    await user.paste('+91 98765 43210');
    expect((screen.getByLabelText(copy.you.phone) as HTMLInputElement).value).toBe('9876543210');
  });

  it('shows a field error on blur, then updates it live', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you');
    const email = screen.getByLabelText(copy.you.email);
    await user.type(email, 'nope');
    expect(screen.queryByText(copy.err.email)).toBeNull();
    await user.tab();
    expect(screen.getByText(copy.err.email)).toBeTruthy();
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBeTruthy();
    await user.type(email, '@srmist.edu.in');
    expect(screen.queryByText(copy.err.email)).toBeNull();
  });

  it('Next on an empty step shows every error and focuses the first field', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you');
    await user.click(next());
    expect(document.activeElement).toBe(screen.getByLabelText(copy.you.name));
    expect(screen.getByText(copy.err.regno)).toBeTruthy();
    expect(screen.getByText(copy.err.phone)).toBeTruthy();
    expect(where()).toBe('/apply/you');
    expect(checkBody).toBeUndefined(); // the duplicate check waits for a valid step
  });

  it('sends the normalised values to the duplicate check, then moves on', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you', validYou);
    await user.click(next());
    await waitFor(() => expect(where()).toBe('/apply/domain'));
    expect(checkBody).toEqual({ registerNumber: 'RA2211003010001', email: 'asha@srmist.edu.in' });
  });

  it('blocks Next with err.duplicate on the taken field and clears it when edited (APP-01-R1)', async () => {
    taken = { registerNumberTaken: true, emailTaken: false };
    const user = userEvent.setup();
    renderApp('/apply/you', validYou);
    await user.click(next());
    const regno = screen.getByLabelText(copy.you.regno);
    await waitFor(() => expect(screen.getByText(copy.err.duplicate)).toBeTruthy());
    expect(where()).toBe('/apply/you');
    expect(regno.getAttribute('aria-invalid')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(regno));
    expect(screen.getAllByText(copy.err.duplicate)).toHaveLength(1);
    await user.type(regno, '{Backspace}');
    expect(screen.queryByText(copy.err.duplicate)).toBeNull();
  });

  it('shows the network message and stays when the check cannot reach the server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    const user = userEvent.setup();
    renderApp('/apply/you', validYou);
    await user.click(next());
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(copy.err.network));
    expect(where()).toBe('/apply/you');
  });
});

describe('step 02a: domain selection (APP-02)', () => {
  const pref = (label: string) => screen.getByRole('combobox', { name: new RegExp(label) });

  it('shows the prompt, and lists all six domains when opened', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', validYou);
    expect(pref(copy.domain.pref1).textContent).toContain(copy.domain.prompt);
    await user.click(pref(copy.domain.pref1));
    expect(screen.getAllByRole('option')).toHaveLength(DOMAINS.length);
  });

  it('removes Preference 1 from the Preference 2 list', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', { ...validYou, domainPref1: 'WEB_DEV' });
    await user.click(pref(copy.domain.pref2));
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toHaveLength(DOMAINS.length - 1);
    expect(names.join('|')).not.toContain('Web development');
  });

  it('picking a row selects it, closes the list and saves the draft', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', validYou);
    await user.click(pref(copy.domain.pref1));
    await user.click(screen.getByRole('option', { name: /Design/ }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(pref(copy.domain.pref1).textContent).toContain('Design');
    await waitFor(() => expect(storedDraft().domainPref1).toBe('DESIGN'));
  });

  it('is keyboard operable: arrows move, Enter picks, Esc closes, typeahead jumps', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', validYou);
    const trigger = pref(copy.domain.pref1);
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const active = trigger.getAttribute('aria-activedescendant')!;
    expect(document.getElementById(active)?.textContent).toContain('Media');
    await user.keyboard('{Enter}');
    expect(trigger.textContent).toContain('Media');
    expect(where()).toBe('/apply/domain'); // Enter never submitted the form

    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();

    await user.keyboard('r');
    expect(document.getElementById(trigger.getAttribute('aria-activedescendant')!)?.textContent).toContain('R&D');
  });

  it('clears Preference 2 and says why when Preference 1 takes its value (APP-02-R1)', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', { ...validYou, ...validDomain });
    await user.click(pref(copy.domain.pref1));
    await user.click(screen.getByRole('option', { name: /Design/ }));
    expect(pref(copy.domain.pref2).textContent).toContain(copy.domain.prompt);
    expect(screen.getByText(copy.domain.pref2Reset)).toBeTruthy();
    await waitFor(() => expect(storedDraft().domainPref2 ?? '').toBe(''));
  });

  it('Next needs both picks (OD-03)', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', { ...validYou, domainPref1: 'TECHNICAL' });
    await user.click(next());
    expect(where()).toBe('/apply/domain');
    expect(screen.getByText(copy.err.required)).toBeTruthy();
    expect(document.activeElement).toBe(pref(copy.domain.pref2));
  });
});

describe('step 02b: about (APP-03)', () => {
  const draft = { ...validYou, ...validDomain };

  it('shows the helper under the title and names the first pick in the label', () => {
    renderApp('/apply/about', draft);
    expect(screen.getByText(copy.about.notFound)).toBeTruthy();
    expect(screen.getByLabelText(fmt(copy.about.whyDomain, { domain: 'Technical' }))).toBeTruthy();
    expect(screen.getByText(copy.about.skillsHelp)).toBeTruthy();
    expect(screen.getByText(copy.about.outsideHelp)).toBeTruthy();
    expect(screen.getByText(copy.about.stackHelp)).toBeTruthy();
  });

  it('shows the character counter only from 800 characters', async () => {
    const user = userEvent.setup();
    renderApp('/apply/about', draft);
    const box = aboutBox();
    await user.click(box);
    await user.paste('x'.repeat(LIMITS.longTextCounterFrom - 1));
    expect(screen.queryByText(fmt(copy.field.counter, { n: String(LIMITS.longTextCounterFrom - 1), max: String(LIMITS.longTextMax) }))).toBeNull();
    await user.paste('x');
    expect(screen.getByText(fmt(copy.field.counter, { n: String(LIMITS.longTextCounterFrom), max: String(LIMITS.longTextMax) }))).toBeTruthy();
    expect(box.getAttribute('maxlength')).toBe(String(LIMITS.longTextMax));
  });

  it('flags a too short answer on blur', async () => {
    const user = userEvent.setup();
    renderApp('/apply/about', draft);
    await user.type(aboutBox(), 'short');
    await user.tab();
    expect(screen.getByText(copy.err.minLength)).toBeTruthy();
  });

  it('Next with nothing filled focuses the first field; with everything valid it moves to step 04', async () => {
    const user = userEvent.setup();
    renderApp('/apply/about', draft);
    await user.click(next());
    expect(document.activeElement).toBe(aboutBox());
    expect(where()).toBe('/apply/about');
  });

  it('passes a complete step on to the next one', async () => {
    const user = userEvent.setup();
    renderApp('/apply/about', { ...draft, ...validAbout });
    await user.click(next());
    expect(where()).toBe('/apply/work');
  });
});
