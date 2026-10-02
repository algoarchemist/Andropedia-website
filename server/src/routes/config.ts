import { Router } from 'express';
import type { AppConfig } from '../config';

// API-01
export function configRouter(config: AppConfig) {
  const router = Router();
  router.get('/config', (_req, res) => {
    res.json({ recruitmentOpen: config.recruitmentOpen, whatsappUrl: config.whatsappUrl });
  });
  return router;
}
