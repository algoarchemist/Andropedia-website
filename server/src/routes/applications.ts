import { randomUUID } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { RATE_LIMITS, applicationSchema, copy, emailInDomain, youSchema } from '@andropedia/shared';
import type { AppConfig } from '../config';
import { DuplicateError, type Db } from '../db';
import { HttpError, apiError, zodToErrors } from '../middleware/errors';
import { makeLimiter } from '../middleware/rateLimit';

const checkSchema = youSchema.pick({ registerNumber: true, email: true });

const isFilled = (v: unknown) => typeof v === 'string' && v !== '';

export function applicationsRouter(config: AppConfig, db: Db) {
  const router = Router();

  // LND-08 / API-04: a closed round blocks both the duplicate check and the submit.
  const requireOpen: RequestHandler = (_req, _res, next) => {
    if (!config.recruitmentOpen) throw new HttpError(403, [apiError('', copy.closed.body)]);
    next();
  };

  const emailAllowed = (email: string) => emailInDomain(email, config.allowedEmailDomain); // SEC-05

  // API-02
  router.post('/applications/check', makeLimiter(RATE_LIMITS.check), requireOpen, async (req, res) => {
    const parsed = checkSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, zodToErrors(parsed.error));
    res.json(await db.findTaken(parsed.data.registerNumber, parsed.data.email));
  });

  // API-04
  router.post('/applications', makeLimiter(RATE_LIMITS.submit), requireOpen, async (req, res) => {
    // SEC-04: a filled honeypot gets a convincing fake success and nothing is stored.
    if (isFilled((req.body as { website?: unknown } | undefined)?.website)) {
      res.status(201).json({ id: randomUUID() });
      return;
    }

    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, zodToErrors(parsed.error));
    const { website: _website, ...data } = parsed.data;

    if (!emailAllowed(data.email)) throw new HttpError(400, [apiError('email', copy.err.email)]);

    const photo = await db.findPhoto(data.photoId);
    if (!photo || photo.linked) throw new HttpError(400, [apiError('photoId', copy.err.required)]);

    try {
      const { id } = await db.createApplication(data);
      res.status(201).json({ id });
    } catch (err) {
      if (err instanceof DuplicateError) {
        if (err.field === 'photoId') throw new HttpError(400, [apiError('photoId', copy.err.required)]);
        throw new HttpError(409, [apiError(err.field, copy.err.duplicate)], { field: err.field });
      }
      throw err;
    }
  });

  return router;
}
