// The persistence boundary. Routes depend on this interface, never on Prisma directly,
// so tests can run without a database and the Prisma implementation stays swappable.
import type { ApplicationInput } from '@andropedia/shared';

export type StoredApplication = Omit<ApplicationInput, 'website'>;

export type ApplicationRow = StoredApplication & {
  id: string;
  createdAt: Date;
  status: string;
  photoUrl: string;
};

export type TakenFlags = { registerNumberTaken: boolean; emailTaken: boolean };

export type PhotoRecord = { id: string; url: string; linked: boolean };

export type DuplicateField = 'registerNumber' | 'email' | 'photoId';

/** Thrown by `createApplication` on a unique constraint failure. */
export class DuplicateError extends Error {
  constructor(public readonly field: DuplicateField) {
    super(`duplicate ${field}`);
  }
}

export interface Db {
  findTaken(registerNumber: string, email: string): Promise<TakenFlags>;
  findPhoto(id: string): Promise<PhotoRecord | null>;
  createPhoto(photo: { id: string; url: string }): Promise<void>;
  createApplication(data: StoredApplication): Promise<{ id: string }>;
  listApplications(): Promise<ApplicationRow[]>;
}
