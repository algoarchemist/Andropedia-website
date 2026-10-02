import { rateLimit } from 'express-rate-limit';
import { RATE_LIMITS, copy } from '@andropedia/shared';
import { apiError } from './errors';

/** One limiter instance per route bucket, so counts are never shared between buckets. */
export function makeLimiter(limit: number) {
  return rateLimit({
    windowMs: RATE_LIMITS.windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ errors: [apiError('', copy.err.rateLimit)] });
    },
  });
}
