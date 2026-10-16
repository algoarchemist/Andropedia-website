"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Minus, Plus } from "lucide-react";
import { jpegUnder } from "@/lib/image-shrink";
import { MAX_PHOTO_BYTES } from "@/lib/member-profile";
import { MAX_ZOOM, MIN_ZOOM, initialCrop, panBy, sourceSquare, zoomAt, type CropState } from "@/lib/photo-crop";

/** Logical size of the crop square. The canvas is drawn at the screen's pixel density on top of this. */
const VIEW = 300;
/** The saved picture is this many pixels square: sharp in every frame the portal and Team page use, and small as a file. */
const OUTPUT = 512;
/** Stay a little under the server's limit. */
const TARGET_BYTES = MAX_PHOTO_BYTES - 16 * 1024;

interface Props {
  file: File;
  /** The picture is being uploaded. */
  busy?: boolean;
  /** An error from the upload, shown inside the dialog. */
  error?: string;
  onCancel: () => void;
  /** Called with the cropped, resized JPEG (always under 400 KB). */
  onConfirm: (photo: Blob) => void;
}

/**
 * A crop dialog like the ones in WhatsApp and Instagram: drag the picture, pinch or use the slider to zoom, and what sits inside
 * the circle is what members will see. The picture is saved as a square, so it also fits the square and rounded frames.
 */
export function PhotoCropper({ file, busy = false, error = "", onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState("");
  // Active pointers (a finger or the mouse), for dragging and pinching.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  // Decode the chosen file. createImageBitmap applies the camera's rotation, so phone photos come out upright.
  useEffect(() => {
    let cancelled = false;
    createImageBitmap(file)
      .then((bitmap) => {
        if (cancelled) return bitmap.close();
        bitmapRef.current = bitmap;
        setCrop(initialCrop(bitmap.width, bitmap.height, VIEW));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError("That file could not be opened as a picture. Try a JPEG or PNG.");
      });
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [file]);

  // Draw the picture where the crop state puts it.
  useEffect(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(VIEW * dpr);
    canvas.height = Math.round(VIEW * dpr);
    const scale = (VIEW / Math.min(bitmap.width, bitmap.height)) * crop.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, crop.x, crop.y, bitmap.width * scale, bitmap.height * scale);
  }, [crop, ready]);

  // Escape closes, and the dialog takes focus when it opens.
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const dims = () => {
    const b = bitmapRef.current;
    return b ? { w: b.width, h: b.height } : null;
  };

  // CSS pixels on screen -> viewport units (the canvas can be shown smaller than VIEW on narrow phones).
  const toView = (clientX: number, clientY: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * VIEW, y: ((clientY - r.top) / r.height) * VIEW, k: VIEW / r.width };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: crop.zoom };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dims();
    const previous = pointers.current.get(e.pointerId);
    if (!d || !previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toView((a.x + b.x) / 2, (a.y + b.y) / 2);
      setCrop((c) => zoomAt(c, pinchStart.current!.zoom * (distance / pinchStart.current!.distance), mid.x, mid.y, d.w, d.h, VIEW));
      return;
    }
    const { k } = toView(e.clientX, e.clientY);
    setCrop((c) => panBy(c, (e.clientX - previous.x) * k, (e.clientY - previous.y) * k, d.w, d.h, VIEW));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const zoomTo = useCallback((zoom: number, px = VIEW / 2, py = VIEW / 2) => {
    const d = dims();
    if (d) setCrop((c) => zoomAt(c, zoom, px, py, d.w, d.h, VIEW));
  }, []);

  // The wheel needs a non-passive listener to stop the page from scrolling while zooming.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toView(e.clientX, e.clientY);
      const d = dims();
      if (d) setCrop((c) => zoomAt(c, c.zoom * Math.exp(-e.deltaY * 0.0015), p.x, p.y, d.w, d.h, VIEW));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [ready]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const d = dims();
    if (!d) return;
    const step = 12;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setCrop((c) => panBy(c, moves[e.key][0], moves[e.key][1], d.w, d.h, VIEW));
    } else if (e.key === "+" || e.key === "=") zoomTo(crop.zoom * 1.1);
    else if (e.key === "-") zoomTo(crop.zoom / 1.1);
  };

  const confirm = async () => {
    const bitmap = bitmapRef.current;
    if (!bitmap) return;
    setLocalError("");
    setWorking(true);
    try {
      const { sx, sy, size } = sourceSquare(crop, bitmap.width, bitmap.height, VIEW);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser cannot process images.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);
      onConfirm(await jpegUnder(canvas, TARGET_BYTES));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not process that photo.");
    }
    setWorking(false);
  };

  const shownError = loadError || localError || error;
  const disabled = busy || working;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        tabIndex={-1}
        className="w-full max-w-sm rounded-[28px] border border-white/10 bg-slate-950 p-5 shadow-[0_30px_120px_rgba(3,7,18,0.85)] outline-none sm:p-6"
      >
        <h2 id="crop-title" className="text-lg font-semibold text-white">Adjust your photo</h2>
        <p className="mt-1 text-[13px] leading-5 text-white/55">Drag to move, pinch or use the slider to zoom. What is inside the circle is what people see.</p>

        <div className="mx-auto mt-4 aspect-square w-full max-w-[300px] select-none">
          <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-900">
            <canvas
              ref={canvasRef}
              tabIndex={0}
              role="img"
              aria-label="Photo crop area. Use the arrow keys to move the picture and plus or minus to zoom."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
              className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            />
            {/* The circle: everything outside it is dimmed. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.6)]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full opacity-30" style={{ backgroundImage: "linear-gradient(to right, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px))" }} />
            {!ready && !loadError && <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white/50">Loading...</div>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => zoomTo(crop.zoom / 1.15)} disabled={!ready || disabled} aria-label="Zoom out" className="rounded-lg border border-white/15 p-2 text-slate-300 hover:text-white disabled:opacity-40">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            disabled={!ready || disabled}
            aria-label="Zoom"
            className="h-2 w-full flex-1 accent-emerald-400"
          />
          <button type="button" onClick={() => zoomTo(crop.zoom * 1.15)} disabled={!ready || disabled} aria-label="Zoom in" className="rounded-lg border border-white/15 p-2 text-slate-300 hover:text-white disabled:opacity-40">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {shownError && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[13px] text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{shownError}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={!ready || disabled} className="btn-glow disabled:opacity-60">
            {busy ? "Uploading..." : working ? "Preparing..." : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
