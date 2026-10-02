import { createHash, timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { copy } from '@andropedia/shared';
import type { AppConfig } from '../config';
import type { Db } from '../db';
import { buildCsv } from '../lib/csv';
import { absoluteUrl } from '../lib/url';
import { HttpError, apiError } from '../middleware/errors';

const digest = (s: string) => createHash('sha256').update(s).digest();

export function adminRouter(config: AppConfig, db: Db) {
  const router = Router();

  // Constant time compare. With no token configured the export is simply unreachable.
  const requireToken: RequestHandler = (req, _res, next) => {
    const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
    const ok = config.adminExportToken !== undefined && match?.[1] !== undefined &&
      timingSafeEqual(digest(match[1]), digest(config.adminExportToken));
    if (!ok) throw new HttpError(401, [apiError('', copy.err.unauthorized)]);
    next();
  };

  // ADM-01
  router.get('/admin/applications.csv', requireToken, async (req, res) => {
    const rows = await db.listApplications();
    res
      .status(200)
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="applications.csv"',
        'Cache-Control': 'no-store',
      })
      // BOM so Excel reads UTF-8 names correctly.
      .send('﻿' + buildCsv(rows, (url) => absoluteUrl(req, url)));
  });

  return router;
}
