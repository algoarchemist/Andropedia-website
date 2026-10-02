// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROGRESS_STAGES, copy } from '@andropedia/shared';
import type { StageState } from '../routes/apply/steps';
import { ProgressBar } from './ProgressBar';

// Motion is mocked: each m.* element renders plainly and exposes its animation props as data attributes.
const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('motion/react', () => {
  const cache = new Map<string, unknown>();
  const make = (tag: string) =>
    forwardRef<HTMLElement, Record<string, unknown>>(function Motion({ initial, animate, exit, transition, ...rest }, ref) {
      const Tag = tag as 'span';
      return (
        <Tag
          ref={ref as never}
          {...(rest as object)}
          data-initial={JSON.stringify(initial)}
          data-animate={JSON.stringify(animate)}
          data-exit={JSON.stringify(exit)}
          data-transition={JSON.stringify(transition)}
        />
      );
    });
  return {
    LazyMotion: ({ children }: { children: ReactNode }) => children,
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    domAnimation: {},
    m: new Proxy({}, { get: (_t, tag: string) => cache.get(tag) ?? cache.set(tag, make(tag)).get(tag) }),
    useReducedMotion: () => motion.reduce,
  };
});

afterEach(() => {
  motion.reduce = false;
});

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderBar(states: StageState[], parts = [false, false]) {
  const ui = (s: StageState[], p: boolean[]) => (
    <MemoryRouter initialEntries={['/apply/us']}>
      <Routes>
        <Route path="*" element={<><ProgressBar states={s} parts={p} /><Where /></>} />
      </Routes>
    </MemoryRouter>
  );
  const view = render(ui(states, parts));
  return { ...view, rerenderWith: (s: StageState[], p = parts) => view.rerender(ui(s, p)) };
}

const stageItems = () => within(screen.getByRole('navigation', { name: copy.progress.label })).getAllByRole('listitem');
const json = (el: Element, attr: string) => JSON.parse(el.getAttribute(attr) ?? 'null');
const numberOf = (k: number) => stageItems()[k]!.querySelector('[data-animate]')!;
const stampOf = (k: number) => stageItems()[k]!.querySelector('[data-stamp]');

describe('ProgressBar (SHL-01)', () => {
  it('renders the five stages with their numbers and labels', () => {
    renderBar(['current', 'locked', 'locked', 'locked', 'locked']);
    expect(stageItems()).toHaveLength(5);
    expect(stageItems().map((li) => li.querySelector('.sr-only')?.textContent)).toEqual([
      '01 You',
      '02 Domain, locked',
      '03 Work, locked',
      '04 Us, locked',
      '05 Done, locked',
    ]);
  });

  it('shows each state correctly: completed is a link, current is aria-current and not tappable, locked is inert', () => {
    renderBar(['completed', 'completed', 'current', 'locked', 'locked']);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/apply/you', '/apply/domain']);
    expect(links.map((a) => a.textContent)).toEqual([expect.stringContaining('01 You, completed'), expect.stringContaining('02 Domain, completed')]);

    const current = stageItems()[2]!.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(within(stageItems()[2]!).queryByRole('link')).toBeNull();
    expect(within(stageItems()[3]!).queryByRole('link')).toBeNull();

    expect(stageItems()[2]!.querySelector('[data-state]')!.className).toContain('bg-yellow'); // stage 03 color
    expect(stageItems()[3]!.querySelector('[data-state]')!.className).toContain('border-ink-30');
    expect(stageItems()[0]!.querySelector('[data-state]')!.className).toContain('bg-ink');
  });

  it('scales the current number about 15% larger', () => {
    renderBar(['current', 'locked', 'locked', 'locked', 'locked']);
    expect(json(numberOf(0), 'data-animate')).toEqual({ scale: 1.15 });
    expect(json(numberOf(1), 'data-animate')).toEqual({ scale: 1 });
  });

  it('puts a check stamp, rotated a few degrees, only on completed stages', () => {
    renderBar(['completed', 'current', 'locked', 'locked', 'locked']);
    expect(stampOf(0)).not.toBeNull();
    expect(json(stampOf(0)!, 'data-animate')).toMatchObject({ rotate: -8 });
    expect(stampOf(1)).toBeNull();
    expect(stampOf(2)).toBeNull();
  });

  it('shows two ticks under stage 02 for parts a and b', () => {
    renderBar(['completed', 'current', 'locked', 'locked', 'locked'], [true, false]);
    const ticks = stageItems()[1]!.querySelectorAll('[data-tick]');
    expect(Array.from(ticks).map((t) => t.getAttribute('data-tick'))).toEqual(['done', 'todo']);
    expect(stageItems()[0]!.querySelectorAll('[data-tick]')).toHaveLength(0);
  });

  it('tapping a completed stage navigates back to it', async () => {
    const user = userEvent.setup();
    renderBar(['completed', 'completed', 'completed', 'current', 'locked']);
    await user.click(screen.getByRole('link', { name: /02 Domain, completed/ }));
    expect(screen.getByTestId('where').textContent).toBe(PROGRESS_STAGES[1].routes[0]);
  });
});

describe('ProgressBar motion (DSN-08)', () => {
  it('when a step passes, its stamp lands (scale and rotation in) and the next number pops after it', () => {
    const { rerenderWith } = renderBar(['current', 'locked', 'locked', 'locked', 'locked']);
    expect(stampOf(0)).toBeNull();

    rerenderWith(['completed', 'current', 'locked', 'locked', 'locked']);

    const stamp = stampOf(0)!;
    expect(json(stamp, 'data-initial')).toEqual({ opacity: 0, scale: 2, rotate: -32 });
    expect(json(stamp, 'data-animate')).toEqual({ opacity: 1, scale: 1, rotate: -8 });
    const stampSeconds = json(stamp, 'data-transition').duration;
    expect(stampSeconds).toBeGreaterThanOrEqual(0.3);
    expect(stampSeconds).toBeLessThanOrEqual(0.4);

    const pop = json(numberOf(1), 'data-transition');
    expect(json(numberOf(1), 'data-animate')).toEqual({ scale: 1.15 });
    expect(pop).toMatchObject({ type: 'spring', delay: stampSeconds });
    // Numbers never animate on first paint.
    expect(json(numberOf(1), 'data-initial')).toBe(false);
  });

  it('under reduced motion the stamp only fades and nothing scales', () => {
    motion.reduce = true;
    const { rerenderWith } = renderBar(['current', 'locked', 'locked', 'locked', 'locked']);
    rerenderWith(['completed', 'current', 'locked', 'locked', 'locked']);

    expect(json(stampOf(0)!, 'data-initial')).toEqual({ opacity: 0, rotate: -8 });
    expect(json(numberOf(1), 'data-transition')).toEqual({ duration: 0 });
  });
});
