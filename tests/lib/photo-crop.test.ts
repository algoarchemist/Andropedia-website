import { describe, expect, it } from "vitest";
import { MAX_ZOOM, MIN_ZOOM, clampCrop, initialCrop, panBy, sourceSquare, zoomAt } from "@/lib/photo-crop";

const VIEW = 300;

describe("photo crop", () => {
  it("starts with the picture filling the square, a tall one from the top so heads are kept", () => {
    const tall = initialCrop(248, 400, VIEW);
    expect(tall.zoom).toBe(1);
    expect(tall.y).toBeCloseTo(0);
    const { sy, size } = sourceSquare(tall, 248, 400, VIEW);
    expect(sy).toBeCloseTo(0);
    expect(size).toBeCloseTo(248);
  });

  it("centres a wide picture", () => {
    const wide = initialCrop(800, 400, VIEW);
    const { sx, size } = sourceSquare(wide, 800, 400, VIEW);
    expect(size).toBeCloseTo(400);
    expect(sx).toBeCloseTo(200);
  });

  it("never lets the picture leave a gap at any edge", () => {
    const start = initialCrop(800, 400, VIEW);
    const panned = panBy(start, 9999, 9999, 800, 400, VIEW);
    expect(panned.x).toBeCloseTo(0);
    expect(panned.y).toBeCloseTo(0);
    const other = panBy(start, -9999, -9999, 800, 400, VIEW);
    const { sx, sy, size } = sourceSquare(other, 800, 400, VIEW);
    expect(sx + size).toBeCloseTo(800);
    expect(sy + size).toBeCloseTo(400);
  });

  it("keeps the point under the pointer still while zooming", () => {
    const start = initialCrop(600, 600, VIEW);
    const before = sourceSquare(start, 600, 600, VIEW);
    const zoomed = zoomAt(start, 2, 150, 150, 600, 600, VIEW);
    const after = sourceSquare(zoomed, 600, 600, VIEW);
    // The centre of the square is the same spot in the original picture before and after.
    expect(after.sx + after.size / 2).toBeCloseTo(before.sx + before.size / 2);
    expect(after.sy + after.size / 2).toBeCloseTo(before.sy + before.size / 2);
    expect(after.size).toBeCloseTo(before.size / 2);
  });

  it("limits the zoom range", () => {
    const start = initialCrop(600, 600, VIEW);
    expect(zoomAt(start, 99, 0, 0, 600, 600, VIEW).zoom).toBe(MAX_ZOOM);
    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, 600, 600, VIEW).zoom).toBe(MIN_ZOOM);
  });
});
