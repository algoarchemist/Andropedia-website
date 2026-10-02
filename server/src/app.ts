import cors from 'cors';
import express, { type RequestHandler } from 'express';
import helmet from 'helmet';
import { JSON_BODY_LIMIT, copy } from '@andropedia/shared';
import type { AppConfig } from './config';
import type { Db } from './db';
import { apiError, errorHandler, notFound } from './middleware/errors';
import { adminRouter } from './routes/admin';
import { applicationsRouter } from './routes/applications';
import { configRouter } from './routes/config';
import { uploadsRouter } from './routes/uploads';
import type { Storage } from './storage';

export type AppDeps = { config: AppConfig; db: Db; storage: Storage };

// SEC-01: HTTPS only in production. Needs `trust proxy` so req.secure honours X-Forwarded-Proto.
const requireHttps: RequestHandler = (req, res, next) => {
  if (req.secure) return next();
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
    return;
  }
  res.status(403).json({ errors: [apiError('', copy.err.unauthorized)] });
};

// SEC-02: route, status and duration only. Never bodies, query strings or personal data.
const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // No route has path params, so the path (minus query string) carries no personal data.
    console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
};

export function createApp({ config, db, storage }: AppDeps, options: { log?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');

  if (config.isProduction) {
    app.set('trust proxy', 1);
    app.use(requireHttps);
  }
  if (options.log) app.use(requestLogger);

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api', configRouter(config), applicationsRouter(config, db), uploadsRouter(db, storage), adminRouter(config, db));

  if (storage.staticDir) {
    // The client lives on another origin, so allow it to embed these images.
    app.use('/uploads', (_req, res, next) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    }, express.static(storage.staticDir, { index: false }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
