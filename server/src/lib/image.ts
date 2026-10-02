import { fileTypeFromBuffer } from 'file-type';
import convert from 'heic-convert';
import sharp from 'sharp';
import { LIMITS, PHOTO_MIME_TYPES } from '@andropedia/shared';

const ALLOWED = new Set<string>(PHOTO_MIME_TYPES);
const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

export class InvalidImageError extends Error {}

/**
 * API-03: sniff magic bytes (never trust the client's mime type), auto-rotate from EXIF,
 * strip all metadata, resize to the long edge limit and encode WebP quality 80.
 */
export async function processPhoto(input: Buffer): Promise<Buffer> {
  const type = await fileTypeFromBuffer(input);
  if (!type || !ALLOWED.has(type.mime)) throw new InvalidImageError('unsupported type');

  try {
    // sharp's prebuilt libvips cannot decode HEVC, so HEIC/HEIF is decoded to JPEG first.
    // libheif applies the HEIC rotation transforms itself; sharp then handles any EXIF orientation.
    const decodable = HEIC_TYPES.has(type.mime)
      ? Buffer.from(await convert({ buffer: input, format: 'JPEG', quality: 0.92 }))
      : input;

    // sharp drops all metadata (EXIF, ICC, XMP) unless asked to keep it.
    return await sharp(decodable)
      .rotate()
      .resize({ width: LIMITS.photoServerMaxEdge, height: LIMITS.photoServerMaxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new InvalidImageError('undecodable image');
  }
}
