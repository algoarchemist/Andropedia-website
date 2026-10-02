import type { AppConfig } from '../config';
import { createCloudinaryStorage } from './cloudinary';
import { createLocalStorage } from './local';

export interface Storage {
  /** Saves a processed WebP and returns its URL. May be a path (`/uploads/x.webp`) for the local driver. */
  save(id: string, webp: Buffer): Promise<{ url: string }>;
  /** Directory to serve statically under `/uploads` (local driver only). */
  readonly staticDir?: string;
}

export function createStorage(config: AppConfig): Storage {
  if (config.storageDriver === 'cloudinary') {
    return createCloudinaryStorage(config.cloudinaryUrl ?? '');
  }
  return createLocalStorage(config.uploadDir);
}
