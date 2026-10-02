// Integration test: real Prisma + PostgreSQL, full HTTP flow. Opt in with TEST_DATABASE_URL.
// It TRUNCATES the Application and Photo tables, so it never reads DATABASE_URL.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createPrismaDb } from '../src/db.prisma';
import { PrismaClient } from '../src/generated/prisma/client';
import { createFakeStorage, baseConfig, ADMIN_TOKEN, validPayload } from './helpers';

const url = process.env['TEST_DATABASE_URL'];

describe.skipIf(!url)('Prisma integration (TEST_DATABASE_URL)', () => {
  const db = createPrismaDb(url ?? '');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url ?? '' }) });
  const app = createApp({ config: baseConfig, db, storage: createFakeStorage().storage });

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Application", "Photo" CASCADE');
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Application", "Photo" CASCADE');
  });
  afterAll(async () => {
    await db.disconnect();
    await prisma.$disconnect();
  });

  const uploadPhoto = async () => {
    const heic = await readFile(path.join(__dirname, 'fixtures', 'sample.heic'));
    const res = await request(app).post('/api/uploads/photo').attach('photo', heic, 'a.heic');
    expect(res.status).toBe(201);
    return res.body.photoId as string;
  };

  it('runs upload, check, submit, duplicate and CSV export end to end', async () => {
    const photoId = await uploadPhoto();
    expect((await request(app).post('/api/applications/check').send({ registerNumber: 'RA2211003010123', email: 'asha@example.com' })).body)
      .toEqual({ registerNumberTaken: false, emailTaken: false });

    const created = await request(app).post('/api/applications').send(validPayload(photoId, { portfolioUrl: 'https://linkedin.com/in/asha' }));
    expect(created.status).toBe(201);

    const row = await prisma.application.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(row).toMatchObject({ registerNumber: 'RA2211003010123', phone: '+919876543210', status: 'SUBMITTED', techStack: ['React', 'Node'] });
    expect(row.achievements).toEqual([{ title: 'Won a hackathon', description: 'Built a thing in 24 hours.' }]);

    expect((await request(app).post('/api/applications/check').send({ registerNumber: 'RA2211003010123', email: 'x@example.com' })).body)
      .toEqual({ registerNumberTaken: true, emailTaken: false });

    const dupReg = await request(app).post('/api/applications').send(validPayload(await uploadPhoto(), { email: 'other@example.com' }));
    expect(dupReg.status).toBe(409);
    expect(dupReg.body.field).toBe('registerNumber');

    const dupEmail = await request(app).post('/api/applications').send(validPayload(await uploadPhoto(), { registerNumber: 'RA2211003010999' }));
    expect(dupEmail.status).toBe(409);
    expect(dupEmail.body.field).toBe('email');

    const reusedPhoto = await request(app).post('/api/applications').send(validPayload(photoId, { registerNumber: 'RA2211003010998', email: 'third@example.com' }));
    expect(reusedPhoto.status).toBe(400);
    expect(reusedPhoto.body.errors[0].path).toBe('photoId');

    const csv = await request(app).get('/api/admin/applications.csv').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('RA2211003010123');
    expect(csv.text.trimEnd().split('\r\n')).toHaveLength(2);
    expect(await prisma.application.count()).toBe(1);
  });
});
