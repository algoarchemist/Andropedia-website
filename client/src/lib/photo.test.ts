import { describe, expect, it } from 'vitest';
import { LIMITS, copy } from '@andropedia/shared';
import { checkPhoto, fitWithin } from './photo';

const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });

describe('photo checks before upload (API-03)', () => {
  it('accepts JPEG, PNG, WebP, HEIC and HEIF', () => {
    const cases: [string, string][] = [
      ['a.jpg', 'image/jpeg'],
      ['a.png', 'image/png'],
      ['a.webp', 'image/webp'],
      ['a.heic', 'image/heic'],
      ['a.heif', 'image/heif'],
    ];
    for (const [name, type] of cases) expect(checkPhoto(file(name, type)), name).toBeUndefined();
  });

  it('accepts a HEIC the browser gave no type, by extension', () => {
    expect(checkPhoto(file('IMG_0001.HEIC', ''))).toBeUndefined();
  });

  it('rejects other types and anything over 8MB', () => {
    expect(checkPhoto(file('a.gif', 'image/gif'))).toBe(copy.err.photoType);
    expect(checkPhoto(file('a.pdf', 'application/pdf'))).toBe(copy.err.photoType);
    expect(checkPhoto(file('a.jpg', 'image/jpeg', LIMITS.photoMaxBytes + 1))).toBe(copy.err.photoSize);
  });

  it('scales the long edge down to the limit, never up', () => {
    expect(fitWithin(4000, 3000, 1200)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 });
    expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 });
  });
});
