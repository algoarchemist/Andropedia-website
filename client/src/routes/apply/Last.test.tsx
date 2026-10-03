// @vitest-environment jsdom
// Step 06 (APP-06): the 30 word rule (R1) and every submit outcome (R2), then the success screen (DONE).
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY, INSTAGRAM_URL, LIMITS, copy, fmt } from '@andropedia/shared';
import { resetConfigCache } from '../../state/config';
import { validThroughUs } from '../../test/fixtures';
import { renderApply, where } from '../../test/renderApply';
import { toPayload } from './Last';

type Reply = { status: number; body?: unknown } | 'offline';
let reply: Reply;
let sent: Record<string, unknown> | undefined;
const WHATSAPP = 'https://chat.whatsapp.com/abc';
let whatsappUrl = WHATSAPP;

beforeEach(() => {
  resetConfigCache();
  reply = { status: 201, body: { id: 'app-1' } };
  whatsappUrl = WHATSAPP;
  sent = undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/api/applications')) {
        sent = JSON.parse(String(init?.body));
        if (reply === 'offline') throw new TypeError('Failed to fetch');
        return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status });
      }
      return new Response(JSON.stringify({ recruitmentOpen: true, whatsappUrl }));
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const answer = () => screen.getByLabelText(copy.last.remember);
const submit = () => screen.getByRole('button', { name: copy.last.submit });
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const ready = { ...validThroughUs, rememberUs: 'I fix things nobody asked me to fix.' };

describe('step 06: One last thing (APP-06)', () => {
  it('shows the intro, a live word counter, and Submit instead of Next', () => {
    renderApply('/apply/last', { ...validThroughUs, rememberUs: 'one two three' });
    expect(screen.getByText(copy.last.intro)).toBeTruthy();
    expect(screen.getByText(fmt(copy.field.counter, { n: '3', max: String(LIMITS.rememberWordsMax) }))).toBeTruthy();
    expect(answer().getAttribute('rows')).toBe('3');
    expect(screen.queryByRole('button', { name: copy.nav.next })).toBeNull();
  });

  it('over 30 words: the counter turns red, err.words shows, Submit is disabled, typing is not blocked (R1)', () => {
    renderApply('/apply/last', validThroughUs);
    fireEvent.change(answer(), { target: { value: words(LIMITS.rememberWordsMax + 1) } });
    expect(screen.getByText(copy.err.words)).toBeTruthy();
    expect((submit() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(answer(), { target: { value: words(LIMITS.rememberWordsMax) } });
    expect(screen.queryByText(copy.err.words)).toBeNull();
    expect((submit() as HTMLButtonElement).disabled).toBe(false);
  });

  it('201: sends the full payload, clears the draft and shows the success screen with WhatsApp and the sign-off', async () => {
    const user = userEvent.setup();
    renderApply('/apply/last', ready);
    await user.click(submit());
    await waitFor(() => expect(where()).toBe('/apply/done'));
    expect(sent).toMatchObject({ name: 'Asha Rao', photoId: validThroughUs.photoId, website: '' });
    expect(sent).not.toHaveProperty('photoUrl');
    await waitFor(() => expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull());

    expect(screen.getByRole('heading', { level: 1, name: copy.done.title })).toBeTruthy();
    expect(screen.getByText(copy.done.body)).toBeTruthy();
    const link = await screen.findByRole('link', { name: copy.done.whatsapp });
    expect(link.getAttribute('href')).toBe(WHATSAPP);
    expect(screen.getByText(fmt(copy.done.signoff, { firstName: 'Asha' }))).toBeTruthy();
    expect(screen.queryByText(copy.done.whatsappSoon)).toBeNull();

    const instagram = screen.getByRole('link', { name: copy.done.instagram });
    expect(instagram.getAttribute('href')).toBe(INSTAGRAM_URL);
    expect(instagram.getAttribute('target')).toBe('_blank');
  });

  it('until the community link is final: a WhatsApp placeholder that is not a link, then the Instagram box', async () => {
    whatsappUrl = '';
    const user = userEvent.setup();
    renderApply('/apply/last', ready);
    await user.click(submit());
    expect(await screen.findByText(copy.done.whatsappSoon)).toBeTruthy();
    expect(screen.getByText(copy.done.whatsappSoon).closest('a')).toBeNull();
    expect(screen.queryByRole('link', { name: copy.done.whatsapp })).toBeNull();
    expect(screen.getByRole('link', { name: copy.done.instagram }).getAttribute('href')).toBe(INSTAGRAM_URL);
  });

  it('the success screen survives unmount when scrollTo returns a Promise, as in current Chrome', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation((() => Promise.resolve()) as unknown as typeof window.scrollTo);
    const user = userEvent.setup();
    const { unmount } = renderApply('/apply/last', ready);
    await user.click(submit());
    expect(await screen.findByRole('heading', { level: 1, name: copy.done.title })).toBeTruthy();
    expect(() => unmount()).not.toThrow();
  });

  it('409: shows err.duplicate and stays', async () => {
    reply = { status: 409, body: { field: 'email', errors: [{ path: 'email', message: copy.err.duplicate }] } };
    const user = userEvent.setup();
    renderApply('/apply/last', ready);
    await user.click(submit());
    expect((await screen.findByRole('alert')).textContent).toContain(copy.err.duplicate);
    expect(where()).toBe('/apply/last');
  });

  it('400: goes to the step that owns the first invalid field and shows the error there', async () => {
    reply = { status: 400, body: { errors: [{ path: 'photoId', message: copy.err.required }] } };
    const user = userEvent.setup();
    renderApply('/apply/last', ready);
    await user.click(submit());
    await waitFor(() => expect(where()).toBe('/apply/work'));
    expect(await screen.findByText(copy.err.required)).toBeTruthy();
  });

  it('network failure: keeps the draft, shows err.network, and Try again resubmits', async () => {
    reply = 'offline';
    const user = userEvent.setup();
    renderApply('/apply/last', ready);
    await user.click(submit());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(copy.err.network);
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    reply = { status: 201, body: { id: 'app-2' } };
    await user.click(screen.getByRole('button', { name: copy.last.retry }));
    await waitFor(() => expect(where()).toBe('/apply/done'));
  });

  it('403: shows the closed message', async () => {
    reply = { status: 403, body: { errors: [{ path: '', message: copy.closed.body }] } };
    const user = userEvent.setup();
    renderApply('/apply/last', ready);
    await user.click(submit());
    expect((await screen.findByRole('alert')).textContent).toContain(copy.closed.body);
  });

  it('the honeypot is out of the tab order and hidden from assistive tech (SEC-04)', () => {
    renderApply('/apply/last', ready);
    const trap = document.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('toPayload drops the display-only photoUrl and adds the honeypot', () => {
    expect(toPayload({ name: 'A', photoUrl: 'x', photoId: 'y' }, 'bot')).toEqual({ name: 'A', photoId: 'y', website: 'bot' });
  });
});
