// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY, copy } from '@andropedia/shared';
import { resetConfigCache } from '../../state/config';
import { DraftProvider, type DraftData } from '../../state/draft';
import { validDomain, validYou } from '../../test/fixtures';
import ApplyRoutes from './ApplyRoutes';

function mockConfig(recruitmentOpen: boolean) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ recruitmentOpen, whatsappUrl: '' }))));
}

function Where() {
  return (
    <p data-testid="where" data-nav={useNavigationType()}>
      {useLocation().pathname}
    </p>
  );
}

function renderApp(path: string, draft?: DraftData) {
  if (draft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DraftProvider>
        <Routes>
          <Route path="/apply/*" element={<><ApplyRoutes /><Where /></>} />
          <Route path="/join" element={<Where />} />
        </Routes>
      </DraftProvider>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;

beforeEach(() => {
  resetConfigCache();
  mockConfig(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('application shell', () => {
  it('every step shows the progress bar and its title', () => {
    renderApp('/apply/you');
    expect(screen.getByRole('navigation', { name: copy.progress.label })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: copy.you.title })).toBeTruthy();
    expect(screen.getByLabelText(copy.you.name)).toBeTruthy();
  });

  it('a guarded redirect says why (SHL-05)', async () => {
    renderApp('/apply/work', validYou);
    await waitFor(() => expect(where()).toBe('/apply/domain'));
    expect(screen.getByRole('alert').textContent).toBe(copy.shell.guarded);
  });

  it('Next with an empty draft shows the step errors and focuses the first field', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you');
    await user.click(screen.getByRole('button', { name: copy.nav.next }));
    expect(document.activeElement?.closest('[data-field]')?.getAttribute('data-field')).toBe('name');
    expect(where()).toBe('/apply/you');
  });

  it('Next and Back move between steps with the draft intact', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you', validYou);
    await user.click(screen.getByRole('button', { name: copy.nav.next }));
    await waitFor(() => expect(where()).toBe('/apply/domain'));
    expect(screen.getByRole('heading', { level: 1, name: copy.domain.title })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: copy.nav.back }));
    expect(where()).toBe('/apply/you');
    // A history pop, not a new entry, so browser back and forward keep step order (SHL-05).
    expect(screen.getByTestId('where').dataset.nav).toBe('POP');
    expect(JSON.parse(window.localStorage.getItem(DRAFT_KEY)!)).toEqual(validYou);
  });

  it('Back on a step opened directly pushes the previous step', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', validYou);
    await user.click(screen.getByRole('button', { name: copy.nav.back }));
    expect(where()).toBe('/apply/you');
    expect(screen.getByTestId('where').dataset.nav).toBe('PUSH');
  });

  it('unknown /apply routes show the 404 page', () => {
    renderApp('/apply/nope');
    expect(screen.getByRole('heading', { level: 1, name: copy.notfound.body })).toBeTruthy();
  });

  it('/apply on its own goes to step 01', () => {
    renderApp('/apply');
    expect(where()).toBe('/apply/you');
  });
});

describe('draft banner (SHL-04)', () => {
  it('shows on return with a draft, then dismisses after moving to another step', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you', validYou);
    expect(screen.getByRole('status').textContent).toContain(copy.draft.restored);
    await user.click(screen.getByRole('button', { name: copy.nav.next }));
    // Step 01's Next waits for the duplicate check (APP-01-R1) before moving on.
    await waitFor(() => expect(screen.queryByText(copy.draft.restored)).toBeNull());
    await user.click(screen.getByRole('button', { name: copy.nav.back }));
    expect(screen.queryByText(copy.draft.restored)).toBeNull();
  });

  it('does not show without a draft', () => {
    renderApp('/apply/you');
    expect(screen.queryByText(copy.draft.restored)).toBeNull();
  });

  it('Start over asks first; keeping the answers changes nothing', async () => {
    const user = userEvent.setup();
    renderApp('/apply/you', validYou);
    await user.click(screen.getByRole('button', { name: copy.draft.reset }));
    expect(screen.getByRole('alertdialog', { name: copy.draft.confirmTitle })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(copy.draft.confirmNo);
    await user.click(screen.getByRole('button', { name: copy.draft.confirmNo }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull();
  });

  it('confirming clears the draft and lands on step 01', async () => {
    const user = userEvent.setup();
    renderApp('/apply/domain', { ...validYou, ...validDomain });
    await user.click(screen.getByRole('button', { name: copy.draft.reset }));
    await user.click(screen.getByRole('button', { name: copy.draft.confirmYes }));
    await waitFor(() => expect(where()).toBe('/apply/you'));
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(screen.queryByText(copy.draft.restored)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull(); // not a guarded redirect
  });
});

describe('closed round (LND-08)', () => {
  it('sends anyone on a step back to the landing page', async () => {
    mockConfig(false);
    renderApp('/apply/you');
    await waitFor(() => expect(where()).toBe('/join'));
  });
});
