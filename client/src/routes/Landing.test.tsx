// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOMAINS, DRAFT_KEY, INSTAGRAM_URL, copy } from '@andropedia/shared';
import { resetConfigCache } from '../state/config';
import { DraftProvider } from '../state/draft';
import { validYou } from '../test/fixtures';
import Landing from './Landing';

function mockConfig(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })),
  );
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <DraftProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </DraftProvider>
    </MemoryRouter>,
  );
}

const applyButtons = () => screen.queryAllByRole('button', { name: copy.cta.apply });

beforeEach(() => {
  resetConfigCache();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Landing copy (PRD 9)', () => {
  it('renders every landing string from copy.ts and DOMAINS', async () => {
    mockConfig({ recruitmentOpen: true, whatsappUrl: '' });
    renderLanding();

    // The h1 text is the four hero lines verbatim, separated by spaces.
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe([copy.hero.l1, copy.hero.l2, copy.hero.l3, copy.hero.l4].join(' '));

    expect(screen.getByText(copy.brand.name)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: copy.about.title })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: copy.domains.title })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: copy.process.title })).toBeTruthy();
    // about.body and footer.body both ship as TODO_CONTENT until the owner fills them.
    expect(screen.getByRole('region', { name: copy.about.title }).textContent).toContain(copy.about.body);
    expect(screen.getByRole('contentinfo').textContent).toBe(copy.footer.body);
    // LND-09: the Instagram logo is a link to the club profile, named for screen readers, opening in a new tab.
    const instagram = within(screen.getByRole('contentinfo')).getByRole('link', { name: copy.footer.instagram });
    expect(instagram.getAttribute('href')).toBe(INSTAGRAM_URL);
    expect(instagram.getAttribute('target')).toBe('_blank');
    expect(instagram.getAttribute('rel')).toBe('noopener noreferrer');

    const steps = within(document.querySelector('ol') as HTMLElement).getAllByRole('listitem');
    expect(steps.map((li) => li.textContent?.replace(/^\d/, '').trim())).toEqual([...copy.process.steps]);

    for (const domain of DOMAINS) {
      expect(screen.getByRole('heading', { level: 3, name: domain.name })).toBeTruthy();
      expect(screen.getByText(domain.tagline)).toBeTruthy();
    }

    await waitFor(() => expect(applyButtons()).toHaveLength(2));
  });

  it('has one h1 and section headings in order', async () => {
    mockConfig({ recruitmentOpen: true, whatsappUrl: '' });
    renderLanding();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      copy.about.title,
      copy.domains.title,
      copy.process.title,
    ]);
  });
});

describe('Apply now (LND-02, LND-06, LND-07)', () => {
  it('shows two Apply now buttons, each opening the Error 404 modal', async () => {
    mockConfig({ recruitmentOpen: true, whatsappUrl: '' });
    const user = userEvent.setup();
    renderLanding();
    await waitFor(() => expect(applyButtons()).toHaveLength(2));

    for (const button of applyButtons()) {
      await user.click(button);
      expect(screen.getByRole('alertdialog', { name: copy.modal.title })).toBeTruthy();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(document.activeElement).toBe(button);
    }
  });

  it('the modal primary button goes to /apply/you', async () => {
    mockConfig({ recruitmentOpen: true, whatsappUrl: '' });
    const user = userEvent.setup();
    renderLanding();
    await waitFor(() => expect(applyButtons()).toHaveLength(2));
    await user.click(applyButtons()[0]!);
    await user.click(screen.getByRole('button', { name: copy.modal.continue }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/apply/you'));
  });

  it('with a saved draft, continue resumes at the first incomplete step', async () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(validYou));
    mockConfig({ recruitmentOpen: true, whatsappUrl: '' });
    const user = userEvent.setup();
    renderLanding();
    await waitFor(() => expect(applyButtons()).toHaveLength(2));
    await user.click(applyButtons()[0]!);
    await user.click(screen.getByRole('button', { name: copy.modal.continue }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/apply/domain'));
  });
});

describe('Closed state (LND-08)', () => {
  it('replaces every Apply now with the closed message', async () => {
    mockConfig({ recruitmentOpen: false, whatsappUrl: '' });
    renderLanding();
    await waitFor(() => expect(screen.getAllByText(copy.closed.body)).toHaveLength(2));
    expect(applyButtons()).toHaveLength(0);
  });

  it('shows neither while the config is loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderLanding();
    expect(applyButtons()).toHaveLength(0);
    expect(screen.queryByText(copy.closed.body)).toBeNull();
  });

  it('falls back to open if the API cannot be reached', async () => {
    mockConfig({}, false);
    renderLanding();
    await waitFor(() => expect(applyButtons()).toHaveLength(2));
  });
});
