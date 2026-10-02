import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { DuplicateError, type ApplicationRow, type Db, type StoredApplication } from '../src/db';
import type { Storage } from '../src/storage';

export const ADMIN_TOKEN = 'a'.repeat(40);

export const baseConfig: AppConfig = {
  port: 0,
  isProduction: false,
  clientOrigin: 'http://localhost:5173',
  recruitmentOpen: true,
  whatsappUrl: 'https://chat.whatsapp.com/abc',
  adminExportToken: ADMIN_TOKEN,
  allowedEmailDomain: undefined,
  storageDriver: 'local',
  uploadDir: './uploads',
  cloudinaryUrl: undefined,
};

/** In-memory Db that enforces the same unique constraints as the Prisma schema. */
export function createFakeDb() {
  const photos = new Map<string, { id: string; url: string }>();
  const applications: ApplicationRow[] = [];

  const db: Db = {
    async findTaken(registerNumber, email) {
      return {
        registerNumberTaken: applications.some((a) => a.registerNumber === registerNumber),
        emailTaken: applications.some((a) => a.email === email),
      };
    },
    async findPhoto(id) {
      const photo = photos.get(id);
      return photo ? { ...photo, linked: applications.some((a) => a.photoId === id) } : null;
    },
    async createPhoto(photo) {
      photos.set(photo.id, photo);
    },
    async createApplication(data: StoredApplication) {
      if (applications.some((a) => a.registerNumber === data.registerNumber)) throw new DuplicateError('registerNumber');
      if (applications.some((a) => a.email === data.email)) throw new DuplicateError('email');
      if (applications.some((a) => a.photoId === data.photoId)) throw new DuplicateError('photoId');
      const id = randomUUID();
      applications.push({ ...data, id, createdAt: new Date('2026-10-03T10:00:00Z'), status: 'SUBMITTED', photoUrl: photos.get(data.photoId)?.url ?? '' });
      return { id };
    },
    async listApplications() {
      return applications;
    },
  };
  return { db, photos, applications };
}

export function createFakeStorage() {
  const saved = new Map<string, Buffer>();
  const storage: Storage = {
    async save(id, webp) {
      saved.set(id, webp);
      return { url: `/uploads/${id}.webp` };
    },
  };
  return { storage, saved };
}

export function makeTestApp(config: Partial<AppConfig> = {}) {
  const fakeDb = createFakeDb();
  const fakeStorage = createFakeStorage();
  const app = createApp({ config: { ...baseConfig, ...config }, db: fakeDb.db, storage: fakeStorage.storage });
  return { app, ...fakeDb, ...fakeStorage };
}

const long = 'This is a long enough answer.';

/** A payload as the client would send it (pre normalisation). */
export function validPayload(photoId: string, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Asha Rao',
    registerNumber: 'ra2211003010123',
    email: 'Asha@Example.com',
    phone: '9876543210',
    department: 'CSE',
    section: 'a1',
    domainPref1: 'WEB_DEV',
    domainPref2: 'DESIGN',
    aboutYou: long,
    whyDomain: long,
    skills: long,
    techStack: ['React', 'Node'],
    outsideAcademics: long,
    whyAndropedia: long,
    oneYearVision: long,
    workUrl: 'https://github.com/asha',
    portfolioUrl: '',
    achievements: [{ title: 'Won a hackathon', description: 'Built a thing in 24 hours.' }],
    photoId,
    hoursPerWeek: 5,
    responsibility: 3,
    inOtherClub: false,
    clubShouldProvide: long,
    rememberUs: 'Because I will ship things and tell terrible jokes.',
    website: '',
    ...overrides,
  };
}

/** Registers a photo in the fake db and returns its id. */
export async function seedPhoto(ctx: { photos: Map<string, { id: string; url: string }> }) {
  const id = randomUUID();
  ctx.photos.set(id, { id, url: `/uploads/${id}.webp` });
  return id;
}

/** A solid JPEG. With `orientation`, it also carries that EXIF orientation plus a Make tag. */
export async function makeJpeg(width: number, height: number, orientation?: number) {
  const img = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } }).jpeg();
  return (orientation ? img.withMetadata({ orientation }).withExif({ IFD0: { Make: 'TestPhone' } }) : img).toBuffer();
}
