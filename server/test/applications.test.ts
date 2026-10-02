import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { copy } from '@andropedia/shared';
import { makeTestApp, seedPhoto, validPayload } from './helpers';

describe('GET /api/config (API-01)', () => {
  it('returns values from config', async () => {
    const { app } = makeTestApp({ recruitmentOpen: false, whatsappUrl: 'https://chat.whatsapp.com/xyz' });
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ recruitmentOpen: false, whatsappUrl: 'https://chat.whatsapp.com/xyz' });
  });
});

describe('POST /api/applications (API-04)', () => {
  it('201 with an id, storing normalised values', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    const res = await request(ctx.app).post('/api/applications').send(validPayload(photoId));
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));

    const stored = ctx.applications[0];
    expect(stored).toMatchObject({
      registerNumber: 'RA2211003010123',
      email: 'asha@example.com',
      phone: '+919876543210',
      section: 'A1',
    });
    expect(stored).not.toHaveProperty('website');
  });

  it('400 with { errors: [{ path, message }] } on invalid input', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    const res = await request(ctx.app)
      .post('/api/applications')
      .send(validPayload(photoId, { registerNumber: 'nope', phone: '123', domainPref2: 'WEB_DEV' }));
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { path: 'registerNumber', message: copy.err.regno },
        { path: 'phone', message: copy.err.phone },
        { path: 'domainPref2', message: copy.domain.pref2Reset },
      ]),
    );
    expect(ctx.applications).toHaveLength(0);
  });

  it('400 when otherClubs is missing but inOtherClub is true', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    const res = await request(ctx.app).post('/api/applications').send(validPayload(photoId, { inOtherClub: true }));
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toEqual({ path: 'otherClubs', message: copy.err.required });
  });

  it('400 when rememberUs is over 30 words', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    const res = await request(ctx.app)
      .post('/api/applications')
      .send(validPayload(photoId, { rememberUs: Array.from({ length: 31 }, () => 'w').join(' ') }));
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toEqual({ path: 'rememberUs', message: copy.err.words });
  });

  it('400 for malformed JSON', async () => {
    const res = await request(makeTestApp().app).post('/api/applications').set('Content-Type', 'application/json').send('{nope');
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(1);
  });

  it('413 for a body over 100kb', async () => {
    const res = await request(makeTestApp().app).post('/api/applications').send({ junk: 'x'.repeat(120 * 1024) });
    expect(res.status).toBe(413);
  });

  it('400 when the photo does not exist', async () => {
    const ctx = makeTestApp();
    const res = await request(ctx.app).post('/api/applications').send(validPayload('6f1c3a52-6d1b-4a0e-9c53-2f2f0d9a1b11'));
    expect(res.status).toBe(400);
    expect(res.body.errors[0].path).toBe('photoId');
  });

  it('400 when the photo is already linked to another application', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    await request(ctx.app).post('/api/applications').send(validPayload(photoId)).expect(201);
    const res = await request(ctx.app)
      .post('/api/applications')
      .send(validPayload(photoId, { registerNumber: 'RA2211003010999', email: 'other@example.com' }));
    expect(res.status).toBe(400);
    expect(res.body.errors[0].path).toBe('photoId');
  });

  it('403 when recruitment is closed, and stores nothing', async () => {
    const ctx = makeTestApp({ recruitmentOpen: false });
    const photoId = await seedPhoto(ctx);
    const res = await request(ctx.app).post('/api/applications').send(validPayload(photoId));
    expect(res.status).toBe(403);
    expect(res.body.errors).toEqual([{ path: '', message: copy.closed.body }]);
    expect(ctx.applications).toHaveLength(0);
  });

  it('409 with { field } for a duplicate register number', async () => {
    const ctx = makeTestApp();
    await request(ctx.app).post('/api/applications').send(validPayload(await seedPhoto(ctx))).expect(201);
    const res = await request(ctx.app)
      .post('/api/applications')
      .send(validPayload(await seedPhoto(ctx), { email: 'different@example.com' }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ field: 'registerNumber', errors: [{ path: 'registerNumber', message: copy.err.duplicate }] });
  });

  it('409 with { field } for a duplicate email, case insensitively', async () => {
    const ctx = makeTestApp();
    await request(ctx.app).post('/api/applications').send(validPayload(await seedPhoto(ctx))).expect(201);
    const res = await request(ctx.app)
      .post('/api/applications')
      .send(validPayload(await seedPhoto(ctx), { registerNumber: 'RA2211003010999', email: 'ASHA@EXAMPLE.COM' }));
    expect(res.status).toBe(409);
    expect(res.body.field).toBe('email');
  });

  it('SEC-04: a filled honeypot gets a fake 201 and stores nothing', async () => {
    const ctx = makeTestApp();
    const photoId = await seedPhoto(ctx);
    const res = await request(ctx.app).post('/api/applications').send(validPayload(photoId, { website: 'http://spam.example' }));
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(ctx.applications).toHaveLength(0);
  });

  it('SEC-04: the honeypot short circuits before validation', async () => {
    const ctx = makeTestApp();
    const res = await request(ctx.app).post('/api/applications').send({ website: 'x' });
    expect(res.status).toBe(201);
  });

  it('SEC-05: rejects emails outside ALLOWED_EMAIL_DOMAIN', async () => {
    const ctx = makeTestApp({ allowedEmailDomain: 'college.edu' });
    const photoId = await seedPhoto(ctx);
    const res = await request(ctx.app).post('/api/applications').send(validPayload(photoId));
    expect(res.status).toBe(400);
    expect(res.body.errors[0].path).toBe('email');

    const ok = await request(ctx.app).post('/api/applications').send(validPayload(photoId, { email: 'asha@college.edu' }));
    expect(ok.status).toBe(201);
  });
});

describe('POST /api/applications/check (API-02)', () => {
  it('reports what is taken, normalising input', async () => {
    const ctx = makeTestApp();
    await request(ctx.app).post('/api/applications').send(validPayload(await seedPhoto(ctx))).expect(201);

    const taken = await request(ctx.app).post('/api/applications/check').send({ registerNumber: ' ra2211003010123', email: 'new@example.com' });
    expect(taken.status).toBe(200);
    expect(taken.body).toEqual({ registerNumberTaken: true, emailTaken: false });

    const both = await request(ctx.app).post('/api/applications/check').send({ registerNumber: 'RA2211003010000', email: 'ASHA@example.com' });
    expect(both.body).toEqual({ registerNumberTaken: false, emailTaken: true });
  });

  it('400 on malformed input', async () => {
    const res = await request(makeTestApp().app).post('/api/applications/check').send({ registerNumber: 'x', email: 'y' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { path: string }) => e.path).sort()).toEqual(['email', 'registerNumber']);
  });

  it('403 when recruitment is closed', async () => {
    const res = await request(makeTestApp({ recruitmentOpen: false }).app)
      .post('/api/applications/check')
      .send({ registerNumber: 'RA2211003010123', email: 'a@b.co' });
    expect(res.status).toBe(403);
    expect(res.body.errors[0].message).toBe(copy.closed.body);
  });
});
