import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { RATE_LIMITS, copy } from '@andropedia/shared';
import { loadConfig } from '../src/config';
import { createCloudinaryStorage, parseCloudinaryUrl } from '../src/storage/cloudinary';
import { createLocalStorage } from '../src/storage/local';
import { createApp } from '../src/app';
import { baseConfig, createFakeDb, makeJpeg, makeTestApp } from './helpers';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('rate limits (per IP, per route bucket)', () => {
  it(`check: allows ${RATE_LIMITS.check} per hour, then 429`, async () => {
    const { app } = makeTestApp();
    for (let i = 0; i < RATE_LIMITS.check; i++) {
      const res = await request(app).post('/api/applications/check').send({});
      expect(res.status).toBe(400);
    }
    const blocked = await request(app).post('/api/applications/check').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.errors).toEqual([{ path: '', message: copy.err.rateLimit }]);
    expect(blocked.headers['ratelimit']).toBeDefined();
  });

  it(`photo: allows ${RATE_LIMITS.photo} per hour, then 429`, async () => {
    const { app } = makeTestApp();
    for (let i = 0; i < RATE_LIMITS.photo; i++) {
      expect((await request(app).post('/api/uploads/photo')).status).toBe(400);
    }
    expect((await request(app).post('/api/uploads/photo')).status).toBe(429);
  });

  it(`submit: allows ${RATE_LIMITS.submit} per hour, then 429`, async () => {
    const { app } = makeTestApp();
    for (let i = 0; i < RATE_LIMITS.submit; i++) {
      expect((await request(app).post('/api/applications').send({})).status).toBe(400);
    }
    expect((await request(app).post('/api/applications').send({})).status).toBe(429);
  });

  it('buckets are independent of each other', async () => {
    const { app } = makeTestApp();
    for (let i = 0; i < RATE_LIMITS.submit + 1; i++) await request(app).post('/api/applications').send({});
    expect((await request(app).post('/api/applications').send({})).status).toBe(429);
    expect((await request(app).post('/api/applications/check').send({})).status).toBe(400);
  });
});

describe('security (SEC-01)', () => {
  it('sets helmet headers and hides x-powered-by', async () => {
    const res = await request(makeTestApp().app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('restricts CORS to CLIENT_ORIGIN', async () => {
    const { app } = makeTestApp({ clientOrigin: 'https://apply.example.com' });
    const allowed = await request(app).get('/api/config').set('Origin', 'https://apply.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://apply.example.com');
    const other = await request(app).get('/api/config').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBe('https://apply.example.com');
  });

  it('in production, redirects plain HTTP GETs and rejects other plain HTTP methods', async () => {
    const { app } = makeTestApp({ isProduction: true });
    const get = await request(app).get('/api/config').set('Host', 'api.example.com');
    expect(get.status).toBe(308);
    expect(get.headers['location']).toBe('https://api.example.com/api/config');
    const post = await request(app).post('/api/applications/check').send({});
    expect(post.status).toBe(403);
  });

  it('in production, allows requests that arrive over HTTPS via the proxy header', async () => {
    const { app } = makeTestApp({ isProduction: true });
    const res = await request(app).get('/api/config').set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(200);
  });

  it('404 for unknown routes in the error format', async () => {
    const res = await request(makeTestApp().app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.errors).toHaveLength(1);
  });

  it('500 hides internals and does not log request bodies', async () => {
    const ctx = makeTestApp();
    ctx.db.findTaken = async () => { throw new Error('db exploded: secret@example.com'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(ctx.app).post('/api/applications/check').send({ registerNumber: 'RA2211003010123', email: 'secret@example.com' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ errors: [{ path: '', message: copy.err.server }] });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret@example.com');
    spy.mockRestore();
  });
});

describe('loadConfig', () => {
  it('reads values from env', () => {
    const c = loadConfig({
      RECRUITMENT_OPEN: 'false', WHATSAPP_COMMUNITY_URL: 'https://chat.whatsapp.com/z', CLIENT_ORIGIN: 'https://x.dev',
      ADMIN_EXPORT_TOKEN: 'z'.repeat(32), ALLOWED_EMAIL_DOMAIN: '@College.edu', PORT: '5000',
    });
    expect(c).toMatchObject({
      recruitmentOpen: false, whatsappUrl: 'https://chat.whatsapp.com/z', clientOrigin: 'https://x.dev',
      allowedEmailDomain: 'college.edu', port: 5000, storageDriver: 'local',
    });
  });
  it('defaults to open recruitment and local storage', () => {
    expect(loadConfig({})).toMatchObject({ recruitmentOpen: true, storageDriver: 'local', adminExportToken: undefined });
  });
  it('rejects bad values loudly', () => {
    expect(() => loadConfig({ RECRUITMENT_OPEN: 'yes' })).toThrow(/RECRUITMENT_OPEN/);
    expect(() => loadConfig({ STORAGE_DRIVER: 's3' })).toThrow(/STORAGE_DRIVER/);
    expect(() => loadConfig({ STORAGE_DRIVER: 'cloudinary' })).toThrow(/CLOUDINARY_URL/);
    expect(() => loadConfig({ ADMIN_EXPORT_TOKEN: 'short' })).toThrow(/ADMIN_EXPORT_TOKEN/);
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/CLIENT_ORIGIN/);
  });
});

describe('storage drivers', () => {
  it('local: writes a webp to disk and returns a path url', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'andropedia-'));
    const storage = createLocalStorage(dir);
    const { url } = await storage.save('abc', Buffer.from('data'));
    expect(url).toBe('/uploads/abc.webp');
    expect((await readFile(path.join(dir, 'abc.webp'))).toString()).toBe('data');
  });

  it('local: files are served under /uploads with cross-origin embedding allowed', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'andropedia-'));
    const storage = createLocalStorage(dir);
    const app = createApp({ config: baseConfig, db: createFakeDb().db, storage });
    const jpeg = await makeJpeg(100, 100);
    const up = await request(app).post('/api/uploads/photo').attach('photo', jpeg, 'a.jpg');
    expect(up.status).toBe(201);
    const file = await request(app).get(new URL(up.body.url).pathname);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('cloudinary: parses its url', () => {
    expect(parseCloudinaryUrl('cloudinary://key:sec%40ret@mycloud')).toEqual({ apiKey: 'key', apiSecret: 'sec@ret', cloudName: 'mycloud' });
    expect(() => parseCloudinaryUrl('https://nope')).toThrow();
  });

  it('cloudinary: sends a signed upload and returns secure_url', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/mycloud/image/upload/v1/andropedia/abc.webp' }), { status: 200 }));
    const storage = createCloudinaryStorage('cloudinary://key:secret@mycloud', fetchMock as unknown as typeof fetch);
    const { url } = await storage.save('abc', Buffer.from('webp'));
    expect(url).toBe('https://res.cloudinary.com/mycloud/image/upload/v1/andropedia/abc.webp');

    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, { body: FormData }];
    expect(endpoint).toBe('https://api.cloudinary.com/v1_1/mycloud/image/upload');
    expect(init.body.get('api_key')).toBe('key');
    expect(init.body.get('public_id')).toBe('andropedia/abc');
    expect(init.body.get('signature')).toMatch(/^[0-9a-f]{40}$/);
    expect(init.body.get('api_secret')).toBeNull();
  });

  it('cloudinary: throws on a failed upload', async () => {
    const storage = createCloudinaryStorage('cloudinary://key:secret@mycloud', (async () => new Response('no', { status: 401 })) as typeof fetch);
    await expect(storage.save('abc', Buffer.from('x'))).rejects.toThrow(/401/);
  });
});
