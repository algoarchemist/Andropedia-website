// The maths behind the profile-photo cropper, free of any browser code so it can be tested directly.
// The viewport is a square of `view` units; the picture is scaled to cover it (zoom 1) or more, and can be dragged but never
// pulled away from the edges, so the saved square never contains empty space.

export interface CropState {
  zoom: number;
  /** Top-left corner of the picture, in viewport units (0 or negative). */
  x: number;
  y: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** Size of the picture's scale at zoom 1: the smaller side exactly fills the viewport. */
export const baseScale = (imgW: number, imgH: number, view: number) => view / Math.min(imgW, imgH);

export function clampCrop(state: CropState, imgW: number, imgH: number, view: number): CropState {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom));
  const scale = baseScale(imgW, imgH, view) * zoom;
  const x = Math.min(0, Math.max(view - imgW * scale, state.x));
  const y = Math.min(0, Math.max(view - imgH * scale, state.y));
  return { zoom, x, y };
}

/** Starts filling the frame. A tall picture starts at the top, because that is where the head usually is. */
export function initialCrop(imgW: number, imgH: number, view: number): CropState {
  const scale = baseScale(imgW, imgH, view);
  return clampCrop({ zoom: 1, x: (view - imgW * scale) / 2, y: imgH > imgW ? 0 : (view - imgH * scale) / 2 }, imgW, imgH, view);
}

/** Changes the zoom while keeping the point under (px, py) where it is. */
export function zoomAt(state: CropState, zoom: number, px: number, py: number, imgW: number, imgH: number, view: number): CropState {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const base = baseScale(imgW, imgH, view);
  const imgX = (px - state.x) / (base * state.zoom);
  const imgY = (py - state.y) / (base * state.zoom);
  return clampCrop({ zoom: next, x: px - imgX * base * next, y: py - imgY * base * next }, imgW, imgH, view);
}

export function panBy(state: CropState, dx: number, dy: number, imgW: number, imgH: number, view: number): CropState {
  return clampCrop({ ...state, x: state.x + dx, y: state.y + dy }, imgW, imgH, view);
}

/** The square of the original picture, in its own pixels, that the viewport currently shows. */
export function sourceSquare(state: CropState, imgW: number, imgH: number, view: number): { sx: number; sy: number; size: number } {
  const scale = baseScale(imgW, imgH, view) * state.zoom;
  return { sx: -state.x / scale, sy: -state.y / scale, size: view / scale };
}
