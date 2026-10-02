import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Storage } from './index';

/** Dev driver: writes to disk and is served by the app under `/uploads`. */
export function createLocalStorage(uploadDir: string): Storage {
  const dir = path.resolve(uploadDir);
  return {
    staticDir: dir,
    async save(id, webp) {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${id}.webp`), webp);
      return { url: `/uploads/${id}.webp` };
    },
  };
}
