// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY } from '@andropedia/shared';
import { validYou } from '../test/fixtures';
import { AUTOSAVE_MS, DraftProvider, readDraft, sanitizeDraft, useDraft, type DraftContextValue } from './draft';

/** Renders a provider and hands back the live context value. */
function mountDraft() {
  const ref: { current: DraftContextValue | null } = { current: null };
  function Probe() {
    ref.current = useDraft();
    return null;
  }
  const view = render(
    <DraftProvider>
      <Probe />
    </DraftProvider>,
  );
  return { draft: () => ref.current!, ...view };
}

const stored = () => window.localStorage.getItem(DRAFT_KEY);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('autosave (SHL-04)', () => {
  it('writes to localStorage 400ms after the last change, not before', () => {
    const { draft } = mountDraft();
    act(() => draft().setData({ name: 'Asha' }));
    act(() => vi.advanceTimersByTime(AUTOSAVE_MS - 50));
    expect(stored()).toBeNull();

    // Another change restarts the debounce.
    act(() => draft().setData({ section: 'A1' }));
    act(() => vi.advanceTimersByTime(AUTOSAVE_MS - 50));
    expect(stored()).toBeNull();

    act(() => vi.advanceTimersByTime(50));
    expect(JSON.parse(stored()!)).toEqual({ name: 'Asha', section: 'A1' });
  });

  it('merges patches, including functional ones', () => {
    const { draft } = mountDraft();
    act(() => draft().setData({ techStack: ['React'] }));
    act(() => draft().setData((prev) => ({ techStack: [...(prev.techStack ?? []), 'Go'] })));
    expect(draft().data).toEqual({ techStack: ['React', 'Go'] });
  });

  it('flushes a pending save on pagehide, so a quick refresh loses nothing', () => {
    const { draft } = mountDraft();
    act(() => draft().setData({ name: 'Asha' }));
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(stored()!)).toEqual({ name: 'Asha' });
  });

  it('flushes a pending save on unmount', () => {
    const { draft, unmount } = mountDraft();
    act(() => draft().setData({ name: 'Asha' }));
    unmount();
    expect(JSON.parse(stored()!)).toEqual({ name: 'Asha' });
  });
});

describe('restore (SHL-04)', () => {
  it('round-trips: a saved draft comes back on the next mount with isDraft set', () => {
    const first = mountDraft();
    act(() => first.draft().setData(validYou));
    act(() => vi.advanceTimersByTime(AUTOSAVE_MS));
    first.unmount();

    const second = mountDraft();
    expect(second.draft().data).toEqual(validYou);
    expect(second.draft().isDraft).toBe(true);
    expect(second.draft().draftNoticeOpen).toBe(true);
  });

  it('starts empty, without the banner, when nothing is stored', () => {
    const { draft } = mountDraft();
    expect(draft().data).toEqual({});
    expect(draft().isDraft).toBe(false);
    expect(draft().draftNoticeOpen).toBe(false);
  });

  it('restoreDraft re-reads storage', () => {
    const { draft } = mountDraft();
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: 'Asha' }));
    let found = false;
    act(() => {
      found = draft().restoreDraft();
    });
    expect(found).toBe(true);
    expect(draft().data).toEqual({ name: 'Asha' });
  });

  it('ignores corrupt JSON and drops unknown or mistyped keys', () => {
    window.localStorage.setItem(DRAFT_KEY, '{not json');
    expect(readDraft()).toEqual({});

    expect(
      sanitizeDraft({
        name: 'Asha',
        website: 'spam', // honeypot never lives in the draft
        photo: 'data:image/png;base64,AAAA', // nor does a file
        hoursPerWeek: '3',
        techStack: ['React', 4],
        achievements: [{ title: 'Won', description: 'A hackathon' }],
      }),
    ).toEqual({ name: 'Asha', achievements: [{ title: 'Won', description: 'A hackathon' }] });
  });
});

describe('clearDraft', () => {
  it('empties memory and storage, cancels a pending save and closes the banner', () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(validYou));
    const { draft } = mountDraft();
    act(() => draft().setData({ section: 'B2' }));
    act(() => draft().clearDraft());
    act(() => vi.advanceTimersByTime(AUTOSAVE_MS * 2));

    expect(draft().data).toEqual({});
    expect(draft().isDraft).toBe(false);
    expect(draft().draftNoticeOpen).toBe(false);
    expect(stored()).toBeNull();
  });
});

describe('storage unavailable', () => {
  it('keeps working in memory when every storage call throws', () => {
    const boom = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);

    const { draft } = mountDraft();
    expect(draft().data).toEqual({});
    act(() => draft().setData({ name: 'Asha' }));
    expect(() => act(() => vi.advanceTimersByTime(AUTOSAVE_MS))).not.toThrow();
    expect(draft().data).toEqual({ name: 'Asha' });
    expect(() => act(() => draft().clearDraft())).not.toThrow();
    expect(draft().data).toEqual({});
  });
});
