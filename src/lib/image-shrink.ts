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
