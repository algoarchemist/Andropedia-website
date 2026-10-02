import type { Request } from 'express';

/** Local driver URLs are paths; make them absolute from the request. Cloudinary URLs pass through. */
export function absoluteUrl(req: Request, url: string): string {
  return /^https?:\/\//.test(url) ? url : `${req.protocol}://${req.get('host')}${url}`;
}
