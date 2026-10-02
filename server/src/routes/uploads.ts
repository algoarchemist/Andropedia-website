import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { LIMITS, RATE_LIMITS, copy } from '@andropedia/shared';
import type { Db } from '../db';
import { InvalidImageError, processPhoto } from '../lib/image';
import { HttpError, apiError } from '../middleware/errors';
import { makeLimiter } from '../middleware/rateLimit';
import type { Storage } from '../storage';
import { absoluteUrl } from '../lib/url';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITS.photoMaxBytes, files: 1 } });

// API-03
export function uploadsRouter(db: Db, storage: Storage) {
  const router = Router();

  router.post('/uploads/photo', makeLimiter(RATE_LIMITS.photo), upload.single('photo'), async (req, res) => {
    if (!req.file) throw new HttpError(400, [apiError('photo', copy.err.required)]);

    let webp: Buffer;
    try {
      webp = await processPhoto(req.file.buffer);
    } catch (err) {
      if (err instanceof InvalidImageError) throw new HttpError(400, [apiError('photo', copy.err.photoType)]);
      throw err;
    }

    const id = randomUUID();
    const { url } = await storage.save(id, webp);
    await db.createPhoto({ id, url });
    res.status(201).json({ photoId: id, url: absoluteUrl(req, url) });
  });

  return router;
}
