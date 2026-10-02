import { createHash } from 'node:crypto';
import type { Storage } from './index';

/** Parses `cloudinary://<api_key>:<api_secret>@<cloud_name>`. */
export function parseCloudinaryUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'cloudinary:' || !url.username || !url.password || !url.hostname) {
    throw new Error('CLOUDINARY_URL must look like cloudinary://key:secret@cloud_name');
  }
  return { apiKey: decodeURIComponent(url.username), apiSecret: decodeURIComponent(url.password), cloudName: url.hostname };
}

/**
 * Prod driver. Uses Cloudinary's signed upload API directly over fetch (no SDK).
 * Not exercised against the live service in phase 2; covered with a mocked fetch.
 */
export function createCloudinaryStorage(cloudinaryUrl: string, fetchImpl: typeof fetch = fetch): Storage {
  const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl(cloudinaryUrl);
  return {
    async save(id, webp) {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const publicId = `andropedia/${id}`;
      // Signature covers the signed params, sorted alphabetically, with the secret appended.
      const signature = createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');

      const form = new FormData();
      form.set('file', new Blob([new Uint8Array(webp)], { type: 'image/webp' }), `${id}.webp`);
      form.set('api_key', apiKey);
      form.set('timestamp', timestamp);
      form.set('public_id', publicId);
      form.set('signature', signature);

      const res = await fetchImpl(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`cloudinary upload failed with status ${res.status}`);
      const body = (await res.json()) as { secure_url?: string };
      if (!body.secure_url) throw new Error('cloudinary response had no secure_url');
      return { url: body.secure_url };
    },
  };
}
