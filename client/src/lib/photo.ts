// API-03, client side: check type and size, then downscale to 1200px on the long edge as JPEG 0.8.
// If the browser cannot decode the file (some HEIC cases), the original is sent and the server converts it.
import { LIMITS, PHOTO_EXTENSIONS, PHOTO_JPEG_QUALITY, PHOTO_MIME_TYPES, copy } from '@andropedia/shared';

/** Returns the error message for a file that must not be uploaded, or undefined when it may be. */
export function checkPhoto(file: File): string | undefined {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const typeOk =
    (PHOTO_MIME_TYPES as readonly string[]).includes(file.type) ||
    ((file.type === '' || file.type === 'application/octet-stream') && (PHOTO_EXTENSIONS as readonly string[]).includes(ext));
  if (!typeOk) return copy.err.photoType;
  if (file.size > LIMITS.photoMaxBytes) return copy.err.photoSize;
  return undefined;
}

/** Long edge scaled down to `maxEdge`, never up. */
export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** A smaller JPEG of the photo, or the original file when the browser cannot decode it. */
export async function downscalePhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, so phone photos are not sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, LIMITS.photoClientMaxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY));
    // Keep the original if the canvas route failed or somehow made it bigger.
    return blob && blob.size < file.size ? blob : file;
  } finally {
    bitmap.close();
  }
}
