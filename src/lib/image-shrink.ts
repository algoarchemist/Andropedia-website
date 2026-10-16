/** Browser-only: shrinks a photo before upload so a 12 MB camera picture becomes a few hundred KB. Always returns a JPEG. */
export async function shrinkImage(file: File, opts: { maxEdge: number; square?: boolean; quality?: number }): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    // A square crop takes the centre; otherwise the whole picture is kept at its own proportions.
    const side = Math.min(bitmap.width, bitmap.height);
    const srcW = opts.square ? side : bitmap.width;
    const srcH = opts.square ? side : bitmap.height;
    const scale = Math.min(1, opts.maxEdge / Math.max(srcW, srcH));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(srcW * scale));
    canvas.height = Math.max(1, Math.round(srcH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser cannot process images.");
    ctx.drawImage(bitmap, (bitmap.width - srcW) / 2, (bitmap.height - srcH) / 2, srcW, srcH, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", opts.quality ?? 0.85));
    if (!blob) throw new Error("Could not process that image.");
    return blob;
  } finally {
    bitmap.close();
  }
}

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

/**
 * Browser-only: encodes a canvas as a JPEG of at most `maxBytes`, whatever the picture. It lowers the quality first and, if that is
 * not enough, the size, so a result always comes back. Transparent areas turn white (JPEG has no transparency).
 */
export async function jpegUnder(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  let current = canvas;
  for (let round = 0; round < 8; round++) {
    for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
      const blob = await canvasToBlob(current, quality);
      if (blob && blob.size <= maxBytes) return blob;
    }
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(64, Math.round(current.width * 0.8));
    smaller.height = Math.max(64, Math.round(current.height * 0.8));
    const ctx = smaller.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(current, 0, 0, smaller.width, smaller.height);
    current = smaller;
  }
  throw new Error("Could not make that photo small enough. Try a different one.");
}
