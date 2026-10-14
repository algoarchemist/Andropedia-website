/**
 * The page Y range a single gesture may travel through a pinned stage whose steps rest at `stops` (ascending page Y
 * positions). From a resting step the gesture may reach the neighbouring steps and no further; from anywhere
 * between two steps (or outside the stage) it may reach the next step in the direction it travels, but not the
 * one after it. `tolerance` is how far from a step's position still counts as resting on it (the parked stretch).
 * A bound that does not exist (above the first step, below the last) is infinite, so the page can still be left.
 */
export function stepBounds(y: number, stops: number[], tolerance: number): { lo: number; hi: number } {
  const last = stops.length - 1;
  const at = stops.findIndex((s) => Math.abs(y - s) <= tolerance);
  if (at >= 0) {
    return { lo: at > 0 ? stops[at - 1] : -Infinity, hi: at < last ? stops[at + 1] : Infinity };
  }
  let lo = -Infinity;
  let hi = Infinity;
  for (const s of stops) {
    if (s < y) lo = s;
    else {
      hi = s;
      break;
    }
  }
  return { lo, hi };
}

/** `y` held inside the bounds from stepBounds. */
export function clampToBounds(y: number, { lo, hi }: { lo: number; hi: number }): number {
  return Math.min(hi, Math.max(lo, y));
}
