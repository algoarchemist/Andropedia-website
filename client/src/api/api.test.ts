import { afterEach, describe, expect, it, vi } from 'vitest';
import { copy } from '@andropedia/shared';
import { ApiError, checkDuplicate, getConfig } from './api';

const respond = (body: unknown, status = 200) =>
  vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getConfig (API-01)', () => {
  it('fetches /api/config and returns recruitmentOpen and whatsappUrl', async () => {
    const fetch = respond({ recruitmentOpen: false, whatsappUrl: 'https://chat.whatsapp.com/x', extra: 1 });
    vi.stubGlobal('fetch', fetch);
    await expect(getConfig()).resolves.toEqual({ recruitmentOpen: false, whatsappUrl: 'https://chat.whatsapp.com/x' });
    expect(fetch.mock.calls[0]![0]).toBe('/api/config');
  });

  it('rejects a malformed body', async () => {
    vi.stubGlobal('fetch', respond({ open: true }));
    await expect(getConfig()).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects with the network message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(getConfig()).rejects.toMatchObject({ status: 0, message: copy.err.network });
  });
});

describe('checkDuplicate (API-02)', () => {
  it('POSTs the register number and email as JSON and returns the flags', async () => {
    const fetch = respond({ registerNumberTaken: true, emailTaken: false });
    vi.stubGlobal('fetch', fetch);
    await expect(checkDuplicate('RA2211003010001', 'asha@srmist.edu.in')).resolves.toEqual({
      registerNumberTaken: true,
      emailTaken: false,
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/applications/check');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(init?.body))).toEqual({ registerNumber: 'RA2211003010001', email: 'asha@srmist.edu.in' });
  });

  it('surfaces the API error list ({errors:[{path,message}]})', async () => {
    vi.stubGlobal('fetch', respond({ errors: [{ path: 'registerNumber', message: copy.err.regno }] }, 400));
    await expect(checkDuplicate('x', 'y')).rejects.toMatchObject({
      status: 400,
      errors: [{ path: 'registerNumber', message: copy.err.regno }],
    });
  });

  it('falls back to the rate limit and server messages when the body has no errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 429 })));
    await expect(checkDuplicate('x', 'y')).rejects.toMatchObject({ message: copy.err.rateLimit });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 502 })));
    await expect(checkDuplicate('x', 'y')).rejects.toMatchObject({ message: copy.err.server });
  });
});
