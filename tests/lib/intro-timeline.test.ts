import { describe, expect, it } from "vitest";
import {
  A_HOLE, A_OUTER, ARROWHEAD, CARET, COL0, COL1, DEL0, DEL_END, DOCK, ENTER, FLY0, FLY_DUR, HOLD, HOLE_START, KEEP, MOR1, TC, TOTAL_MS, TRIANGLE, TYPE_END, TY0,
  URL_STR, ease, mixPts, nChars,
} from "../../src/lib/intro-timeline";

describe("intro timeline", () => {
  it("runs in order and plays by itself: no wait for a click", () => {
    const order = [TY0, TYPE_END, DEL0, DEL_END, ENTER, COL0, COL1, MOR1, TC];
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(TC).toBe(MOR1 + HOLD);
    expect(HOLD).toBeLessThan(1000); // the triangle holds only briefly
    expect(DOCK).toBeGreaterThan(FLY0);
    expect(TOTAL_MS).toBeGreaterThan(TC);
  });

  it("types nothing before the start and the whole address by the end of typing", () => {
    expect(nChars(0)).toBe(0);
    expect(nChars(TYPE_END)).toBe(URL_STR.length);
  });

  it("never types backwards, and then deletes down to just the domain", () => {
    let last = 0;
    for (let t = TY0; t <= TYPE_END; t += 3) {
      const n = nChars(t);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    expect(nChars((DEL0 + DEL_END) / 2)).toBeLessThan(URL_STR.length);
    expect(nChars(DEL_END)).toBe(KEEP);
    expect(URL_STR.slice(0, KEEP)).toBe("https://andropedia-rmp.vercel.app");
  });

  it("every shape that morphs has the same number of points", () => {
    expect(CARET.length).toBe(TRIANGLE.length);
    expect(TRIANGLE.length).toBe(A_OUTER.length);
    expect(HOLE_START.length).toBe(A_HOLE.length);
    expect(ARROWHEAD.length).toBe(3);
  });

  it("the caret, the triangle and the A all sit around the same spot", () => {
    const mid = (p: [number, number][]) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
    const [cx] = mid(CARET);
    const [tx, ty] = mid(TRIANGLE);
    expect(Math.abs(cx - tx)).toBeLessThan(120);
    const [ax, ay] = mid(A_OUTER);
    expect(Math.abs(ax - tx)).toBeLessThan(160);
    expect(Math.abs(ay - ty)).toBeLessThan(160);
  });

  it("mixing runs from the first shape to the second", () => {
    expect(mixPts(CARET, TRIANGLE, 0)).toEqual(CARET);
    expect(mixPts(TRIANGLE, A_OUTER, 1)).toEqual(A_OUTER);
  });

  it("the flight to the navbar is unhurried and eases gently out of the start and into the end", () => {
    expect(FLY_DUR).toBeGreaterThanOrEqual(1500);
    expect(ease.smooth(0)).toBe(0);
    expect(ease.smooth(1)).toBe(1);
    expect(ease.smooth(0.05)).toBeLessThan(0.01); // barely moving at first
    expect(ease.smooth(0.95)).toBeGreaterThan(0.99); // barely moving at the end
    let last = 0;
    for (let x = 0; x <= 1; x += 0.02) {
      expect(ease.smooth(x)).toBeGreaterThanOrEqual(last);
      last = ease.smooth(x);
    }
    expect(DOCK).toBe(FLY0 + FLY_DUR);
  });

  it("easings finish at 1; only the back easing may overshoot", () => {
    expect(ease.io(1)).toBe(1);
    expect(ease.out(1)).toBe(1);
    expect(ease.back(1)).toBeCloseTo(1, 5);
    for (let x = 0; x <= 1; x += 0.05) {
      expect(ease.io(x)).toBeLessThanOrEqual(1);
      expect(ease.out(x)).toBeLessThanOrEqual(1);
    }
  });
});
