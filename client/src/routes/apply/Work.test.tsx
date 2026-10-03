// @vitest-environment jsdom
// Step 04 portfolio wall (APP-04): tiles, inline editors and Next errors.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY, LIMITS, copy, fmt } from '@andropedia/shared';
import { resetConfigCache } from '../../state/config';
import { DraftProvider, type DraftData } from '../../state/draft';
import { validAbout, validDomain, validYou } from '../../test/fixtures';
import ApplyRoutes from './ApplyRoutes';

const base = { ...validYou, ...validDomain, ...validAbout };
const PHOTO_ID = '6f1c2b1e-8d5a-4c3e-9f7a-2b4c6d8e0a1b';

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

function renderWork(draft: DraftData = base) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return render(
    <MemoryRouter initialEntries={['/apply/work']}>
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

const stored = () => JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}') as DraftData;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
/** Empty tiles are named by their prompt plus the field label under it. */
const emptyTile = (prompt: string) => button(new RegExp(prompt.replace('+', '\\+')));

beforeEach(() => {
  resetConfigCache();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ recruitmentOpen: true, whatsappUrl: '' }))));
});
afterEach(() => vi.unstubAllGlobals());

describe('portfolio wall (APP-04)', () => {
  it('starts with dashed prompt tiles and no generic dropzone (R2, R5)', () => {
    renderWork();
    expect(emptyTile(copy.work.empty.photo)).toBeTruthy();
    expect(emptyTile(copy.work.empty.link)).toBeTruthy();
    expect(emptyTile(copy.work.empty.portfolio)).toBeTruthy();
    expect(emptyTile(copy.work.empty.proud)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/drag|drop files|browse/i);
    const input = screen.getByTestId('photo-input');
    expect(input.getAttribute('accept')).toBe('image/*');
    expect(input.hasAttribute('capture')).toBe(false); // camera and gallery both offered
  });

  it('tapping a link tile opens a straight editor; Pin it turns the link into a tile (R1, R2)', async () => {
    const user = userEvent.setup();
    renderWork();
    await user.click(emptyTile(copy.work.empty.link));
    const input = screen.getByLabelText(copy.work.link);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('type')).toBe('url');
    await user.type(input, 'https://github.com/asha-rao');
    await user.click(button(copy.work.save));
    const tile = button(fmt(copy.work.linkTile, { label: copy.work.link, link: 'github.com/asha-rao' }));
    expect(tile.textContent).toContain('github.com');
    await waitFor(() => expect(document.activeElement).toBe(tile));
    await waitFor(() => expect(stored().workUrl).toBe('https://github.com/asha-rao'));
  });

  it('keeps the editor open with an error for a link that is not https', async () => {
    const user = userEvent.setup();
    renderWork();
    await user.click(emptyTile(copy.work.empty.link));
    await user.type(screen.getByLabelText(copy.work.link), 'http://asha.dev');
    await user.click(button(copy.work.save));
    expect(screen.getByText(copy.err.url)).toBeTruthy();
    expect(screen.getByLabelText(copy.work.link)).toBeTruthy();
  });

  it('adds up to three achievements as index cards, then the empty slot goes away', async () => {
    const user = userEvent.setup();
    renderWork();
    for (let n = 1; n <= LIMITS.achievementsMax; n++) {
      await user.click(emptyTile(copy.work.empty.proud));
      await user.type(screen.getByLabelText(copy.work.proudTitle), `Win ${n}`);
      await user.type(screen.getByLabelText(copy.work.proudDesc), 'We built a thing.');
      await user.click(button(copy.work.save));
      expect(button(fmt(copy.work.proudTile, { n: String(n), title: `Win ${n}` }))).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: new RegExp(copy.work.empty.proud.replace('+', '\\+')) })).toBeNull();
    await waitFor(() => expect(stored().achievements).toHaveLength(3));
  });

  it('an achievement left blank is dropped; Remove deletes one', async () => {
    const user = userEvent.setup();
    renderWork({ ...base, achievements: [{ title: 'Hackathon', description: 'Second place.' }] });
    await user.click(emptyTile(copy.work.empty.proud));
    await user.click(button(copy.work.save));
    await waitFor(() => expect(stored().achievements).toHaveLength(1));

    await user.click(button(fmt(copy.work.proudTile, { n: '1', title: 'Hackathon' })));
    await user.click(button(copy.work.remove));
    await waitFor(() => expect(stored().achievements).toHaveLength(0));
  });

  it('Next on an empty wall focuses the photo tile and shows the errors under the tiles', async () => {
    const user = userEvent.setup();
    renderWork();
    await user.click(button(copy.nav.next));
    expect(document.activeElement).toBe(emptyTile(copy.work.empty.photo));
    expect(screen.getAllByText(copy.err.required).length).toBeGreaterThan(0);
    expect(screen.getByTestId('where').textContent).toBe('/apply/work');
  });

  it('shows the polaroid with the first name, and Remove photo clears it', async () => {
    const user = userEvent.setup();
    renderWork({ ...base, photoId: PHOTO_ID, photoUrl: 'https://cdn.example/p.webp' });
    expect(screen.getByRole('img', { name: fmt(copy.work.photoAlt, { name: 'Asha' }) })).toBeTruthy();
    expect(screen.getByText('Asha', { selector: 'figcaption' })).toBeTruthy();
    expect(button(copy.work.replace)).toBeTruthy();
    await user.click(button(copy.work.removePhoto));
    expect(emptyTile(copy.work.empty.photo)).toBeTruthy();
    await waitFor(() => expect(stored().photoId).toBe(''));
  });

  it('a complete wall moves on to step 05', async () => {
    const user = userEvent.setup();
    renderWork({
      ...base,
      workUrl: 'https://github.com/asha',
      achievements: [{ title: 'Hackathon', description: 'Second place.' }],
      photoId: PHOTO_ID,
      photoUrl: 'https://cdn.example/p.webp',
    });
    await user.click(button(copy.nav.next));
    expect(screen.getByTestId('where').textContent).toBe('/apply/us');
  });

  it('rejects a GIF before uploading anything', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderWork();
    await user.upload(screen.getByTestId('photo-input') as HTMLInputElement, new File(['x'], 'a.gif', { type: 'image/gif' }));
    expect(screen.getByRole('alert').textContent).toContain(copy.err.photoType);
  });
});
