import path from 'node:path';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { LIMITS, copy } from '@andropedia/shared';
import { makeJpeg, makeTestApp } from './helpers';

const HEIC_FIXTURE = path.join(__dirname, 'fixtures', 'sample.heic');

async function upload(ctx: ReturnType<typeof makeTestApp>, file: Buffer, filename = 'photo.jpg', contentType = 'image/jpeg') {
  return request(ctx.app).post('/api/uploads/photo').attach('photo', file, { filename, contentType });
}

describe('POST /api/uploads/photo (API-03)', () => {
  it('converts a real HEIC to WebP with no EXIF', async () => {
    const heic = await readFile(HEIC_FIXTURE);
    // Sanity: the fixture really is HEIC and really carries EXIF, otherwise this test proves nothing.
    expect(heic.subarray(4, 12).toString('latin1')).toBe('ftypheic');
    expect((await sharp(heic).metadata()).exif).toBeDefined();

    const ctx = makeTestApp();
    const res = await upload(ctx, heic, 'IMG_0001.HEIC', 'image/heic');
    expect(res.status).toBe(201);
    expect(res.body.photoId).toEqual(expect.any(String));
    expect(res.body.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/uploads\/.+\.webp$/);

    const out = ctx.saved.get(res.body.photoId);
    expect(out).toBeDefined();
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(LIMITS.photoServerMaxEdge);
    // And a Photo row exists.
    expect(ctx.photos.get(res.body.photoId)).toBeDefined();
  });

  it('detects HEIC by content, not by the filename or mime type the client claims', async () => {
    const ctx = makeTestApp();
    const res = await upload(ctx, await readFile(HEIC_FIXTURE), 'holiday.jpg', 'image/jpeg');
    expect(res.status).toBe(201);
    expect((await sharp(ctx.saved.get(res.body.photoId)).metadata()).format).toBe('webp');
  });

  it('auto-rotates from EXIF orientation, strips EXIF and resizes to 1080px', async () => {
    const ctx = makeTestApp();
    // 3000x2000 with orientation 6 displays as 2000x3000, so the long edge scales to 1080: 720x1080.
    const jpeg = await makeJpeg(3000, 2000, 6);
    const input = await sharp(jpeg).metadata();
    expect(input.orientation).toBe(6);
    expect(input.exif).toBeDefined();

    const res = await upload(ctx, jpeg);
    expect(res.status).toBe(201);
    const meta = await sharp(ctx.saved.get(res.body.photoId)).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect([meta.width, meta.height]).toEqual([720, 1080]);
  });

  it('does not upscale small images', async () => {
    const ctx = makeTestApp();
    const res = await upload(ctx, await makeJpeg(300, 200));
    const meta = await sharp(ctx.saved.get(res.body.photoId)).metadata();
    expect([meta.width, meta.height]).toEqual([300, 200]);
  });

  it('accepts PNG and WebP', async () => {
    const ctx = makeTestApp();
    const png = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#fff' } }).png().toBuffer();
    const webp = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#fff' } }).webp().toBuffer();
    expect((await upload(ctx, png, 'a.png', 'image/png')).status).toBe(201);
    expect((await upload(ctx, webp, 'a.webp', 'image/webp')).status).toBe(201);
  });

  it('400 for non-image content even when named .jpg', async () => {
    const res = await upload(makeTestApp(), Buffer.from('<?php echo "hi"; ?>'), 'evil.jpg', 'image/jpeg');
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ path: 'photo', message: copy.err.photoType }]);
  });

  it('400 for an image type that is not allowed (GIF)', async () => {
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const res = await upload(makeTestApp(), gif, 'a.gif', 'image/gif');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe(copy.err.photoType);
  });

  it('400 for a truncated image that passes the sniff', async () => {
    const jpeg = await makeJpeg(400, 400);
    const res = await upload(makeTestApp(), jpeg.subarray(0, 120));
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe(copy.err.photoType);
  });

  it('400 over 8MB', async () => {
    const big = Buffer.concat([await makeJpeg(10, 10), Buffer.alloc(LIMITS.photoMaxBytes + 1024)]);
    const res = await upload(makeTestApp(), big);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ path: 'photo', message: copy.err.photoSize }]);
  });

  it('400 when no file is sent', async () => {
    const res = await request(makeTestApp().app).post('/api/uploads/photo');
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toEqual({ path: 'photo', message: copy.err.required });
  });
});
