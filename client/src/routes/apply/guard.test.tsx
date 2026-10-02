// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_KEY } from '@andropedia/shared';
import { DraftProvider, type DraftData } from '../../state/draft';
import { validAbout, validDomain, validYou } from '../../test/fixtures';
import { guardRedirect, isGuardState, useRouteGuard } from './guard';
import { DONE_PATH, STEPS, firstInvalidStep, progressFor } from './steps';

describe('steps (PRD 3)', () => {
  it('lists the six form routes in order, mapped onto the five stages', () => {
    expect(STEPS.map((s) => [s.path, s.stage, s.n])).toEqual([
      ['/apply/you', 0, '01'],
      ['/apply/domain', 1, '02'],
      ['/apply/about', 1, '03'],
      ['/apply/work', 2, '04'],
      ['/apply/us', 3, '05'],
      ['/apply/last', 4, '06'],
    ]);
  });

  it('firstInvalidStep finds the first step whose schema fails', () => {
    expect(firstInvalidStep({})).toBe(0);
    expect(firstInvalidStep(validYou)).toBe(1);
    expect(firstInvalidStep({ ...validYou, ...validDomain })).toBe(2);
    // pref 2 equal to pref 1 fails the domain step.
    expect(firstInvalidStep({ ...validYou, domainPref1: 'MEDIA', domainPref2: 'MEDIA' })).toBe(1);
  });
});

describe('guardRedirect (SHL-05)', () => {
  it('lets step 01 open with an empty draft', () => {
    expect(guardRedirect('/apply/you', {}, undefined)).toBeNull();
  });

  it('redirects to the first incomplete step', () => {
    expect(guardRedirect('/apply/work', {}, undefined)).toBe('/apply/you');
    expect(guardRedirect('/apply/work', validYou, undefined)).toBe('/apply/domain');
    expect(guardRedirect('/apply/last', { ...validYou, ...validDomain }, undefined)).toBe('/apply/about');
  });

  it('allows a step once every earlier step is valid, even if that step itself is empty', () => {
    expect(guardRedirect('/apply/domain', validYou, undefined)).toBeNull();
    expect(guardRedirect('/apply/about', { ...validYou, ...validDomain }, undefined)).toBeNull();
  });

  it('allows going back to an earlier step', () => {
    expect(guardRedirect('/apply/you', { ...validYou, ...validDomain }, undefined)).toBeNull();
  });

  it('sends /apply/done to the landing page without a submission id from this session', () => {
    expect(guardRedirect(DONE_PATH, { ...validYou, ...validDomain }, undefined)).toBe('/');
    expect(guardRedirect(DONE_PATH, {}, 'b6a1c2d4-0000-4000-8000-000000000000')).toBeNull();
  });
});

describe('useRouteGuard', () => {
  /** Paths whose step content was committed to the DOM. */
  let rendered: string[] = [];
  beforeEach(() => {
    rendered = [];
  });

  function Content() {
    const { pathname } = useLocation();
    useEffect(() => {
      rendered.push(pathname);
    }, [pathname]);
    return <p>step content</p>;
  }
  function Step() {
    const allowed = useRouteGuard();
    return allowed ? <Content /> : null;
  }
  function Where() {
    const { pathname, state } = useLocation();
    return <p data-testid="where" data-guarded={String(isGuardState(state))}>{pathname}</p>;
  }

  function renderAt(path: string, draft: DraftData) {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return render(
      <MemoryRouter initialEntries={[path]}>
        <DraftProvider>
          <Routes>
            <Route path="/apply/*" element={<><Step /><Where /></>} />
            <Route path="/" element={<Where />} />
          </Routes>
        </DraftProvider>
      </MemoryRouter>,
    );
  }

  // The router commits navigations as transitions, hence the waits.
  it('redirects to the first invalid step and marks the redirect', async () => {
    renderAt('/apply/us', validYou);
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/apply/domain'));
    expect(screen.getByTestId('where').dataset.guarded).toBe('true');
    expect(screen.getByText('step content')).toBeTruthy();
  });

  it('never renders the blocked step, not even for a frame', async () => {
    renderAt('/apply/us', validYou);
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/apply/domain'));
    expect(rendered).toEqual(['/apply/domain']);
  });

  it('renders the step when every earlier step is valid', () => {
    renderAt('/apply/about', { ...validYou, ...validDomain });
    expect(screen.getByTestId('where').textContent).toBe('/apply/about');
    expect(screen.getByTestId('where').dataset.guarded).toBe('false');
  });

  it('redirects /apply/done without a submission id to /', async () => {
    renderAt('/apply/done', { ...validYou, ...validDomain });
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/'));
    expect(screen.queryByText('step content')).toBeNull();
  });
});

describe('progressFor (SHL-01)', () => {
  it('step 01 with an empty draft: current, then locked', () => {
    expect(progressFor('/apply/you', {}, false).states).toEqual(['current', 'locked', 'locked', 'locked', 'locked']);
  });

  it('marks earlier stages completed and fills the stage 02 tick for part a', () => {
    const { states, parts } = progressFor('/apply/about', { ...validYou, ...validDomain }, false);
    expect(states).toEqual(['completed', 'current', 'locked', 'locked', 'locked']);
    expect(parts).toEqual([true, false]);
  });

  it('keeps later stages completed after going back, so they stay tappable', () => {
    const full = { ...validYou, ...validDomain, ...validAbout };
    expect(progressFor('/apply/you', full, false).states).toEqual(['current', 'completed', 'locked', 'locked', 'locked']);
    // Stage 02 needs both parts: with part b empty it stays locked.
    expect(progressFor('/apply/you', { ...validYou, ...validDomain }, false).states[1]).toBe('locked');
  });

  it('never marks 05 completed before submitting', () => {
    expect(progressFor('/apply/us', { ...validYou, ...validDomain, ...validAbout }, false).states[4]).toBe('locked');
  });

  it('completes all five stages on the success screen only', () => {
    expect(progressFor(DONE_PATH, {}, true)).toEqual({ states: Array(5).fill('completed'), parts: [true, true] });
  });
});
