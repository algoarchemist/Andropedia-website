import { describe, expect, it } from "vitest";
import { advance, DESKTOP_LAYOUT, OVERSHOOT, edgeFade, holeAngle, PHONE_LAYOUT, pointerAngle, polar, pull, reachedStop, requiredRotation, returnSeconds, shortestDelta, visibleAngle } from "@/lib/dial";

const LAYOUTS = { phone: PHONE_LAYOUT, desktop: DESKTOP_LAYOUT };

describe.each(Object.entries(LAYOUTS))("%s dial geometry", (_name, layout) => {
  it("each ring is exactly its required turn away from the finger stop", () => {
    for (let i = 0; i < 4; i++) expect((holeAngle(layout, i) + requiredRotation(layout, i)) % 360).toBeCloseTo(layout.stop, 6);
  });
  it("ring 1 needs the smallest pull, the last ring the biggest, and none is a full turn", () => {
    const turns = [0, 1, 2, 3].map((i) => requiredRotation(layout, i));
    expect(turns).toEqual([...turns].sort((a, b) => a - b));
    expect(turns[3]).toBeLessThan(360);
  });
  it("every ring, and its whole pull to the stop, stays in the visible lower half", () => {
    for (let i = 0; i < 4; i++) {
      expect(holeAngle(layout, i)).toBeGreaterThanOrEqual(90);
      expect(holeAngle(layout, i) + requiredRotation(layout, i)).toBeLessThanOrEqual(270);
    }
  });
  it("reads 1 to 4 from left to right along the bottom", () => {
    const xs = [0, 1, 2, 3].map((i) => polar(0, 0, 100, holeAngle(layout, i)).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });
  it("the catch wedge stops well short of ring 1's full pull, so a nudge is not a dial", () => {
    const first = requiredRotation(layout, 0);
    expect(first - layout.catchDeg).toBeGreaterThan(10);
    expect(reachedStop(first - layout.catchDeg, first, layout.catchDeg)).toBe(true);
    expect(reachedStop(first - layout.catchDeg - 1, first, layout.catchDeg)).toBe(false);
  });
});

describe("phone dial", () => {
  it("puts the rings along the bottom of the half dial", () => {
    expect([0, 1, 2, 3].map((i) => holeAngle(PHONE_LAYOUT, i))).toEqual([209, 177, 145, 113]);
  });
  it("keeps neighbouring 70 px rings on the 140 px track apart, with a small gap", () => {
    const a = polar(0, 0, 140, holeAngle(PHONE_LAYOUT, 0));
    const b = polar(0, 0, 140, holeAngle(PHONE_LAYOUT, 1));
    const gap = Math.hypot(a.x - b.x, a.y - b.y) - 70;
    expect(gap).toBeGreaterThan(3);
    expect(gap).toBeLessThan(12);
  });
  it("keeps every ring fully on screen below the top edge and inside the rim", () => {
    for (let i = 0; i < 4; i++) expect(polar(0, 0, 140, holeAngle(PHONE_LAYOUT, i)).y).toBeGreaterThan(35);
    expect(140 + 35).toBeLessThanOrEqual(190 - 12);
  });
  it("puts the finger stop below the logo and back button (about 60 px tall) at 380 px wide", () => {
    expect(polar(190, 0, 184, PHONE_LAYOUT.stop).y).toBeGreaterThan(70);
  });
});

describe("desktop dial", () => {
  it("keeps neighbouring 86 px rings on the 220 px track clearly apart, but not too far", () => {
    const a = polar(0, 0, 220, holeAngle(DESKTOP_LAYOUT, 0));
    const b = polar(0, 0, 220, holeAngle(DESKTOP_LAYOUT, 1));
    const gap = Math.hypot(a.x - b.x, a.y - b.y) - 86;
    expect(gap).toBeGreaterThan(25);
    expect(gap).toBeLessThan(45);
  });
  it("keeps every ring fully on screen below the top edge and inside the rim", () => {
    for (let i = 0; i < 4; i++) expect(polar(0, 0, 220, holeAngle(DESKTOP_LAYOUT, i)).y).toBeGreaterThan(43);
    expect(220 + 43).toBeLessThanOrEqual(280 - 16);
  });
});

describe("rings that are turned past the left end of the half dial", () => {
  it("leave at the left end and come back in at the right end", () => {
    expect(visibleAngle(200)).toBe(200); // already visible: untouched
    expect(visibleAngle(284.5)).toBeCloseTo(104.5, 6); // just past the left end: now at the right end
    expect(visibleAngle(309)).toBeCloseTo(129, 6);
  });
  it("are always drawn inside the visible span", () => {
    for (let a = 0; a <= 720; a += 7) {
      const v = visibleAngle(a);
      expect(v).toBeGreaterThanOrEqual(104);
      expect(v).toBeLessThan(284);
    }
  });
  it("are invisible at the instant they jump from one end to the other, so nothing pops", () => {
    expect(edgeFade(283.999)).toBeCloseTo(0, 5); // about to leave on the left
    expect(edgeFade(104)).toBe(0); // just entered on the right
    expect(edgeFade(180)).toBe(1);
  });
  it("fade smoothly: no frame to frame step bigger than a few percent even when the dial moves 1 degree per frame", () => {
    let last = edgeFade(104);
    for (let a = 105; a < 284; a += 1) {
      const f = edgeFade(a);
      expect(Math.abs(f - last)).toBeLessThan(0.2);
      last = f;
    }
  });
  it("stay solid at the finger stop", () => {
    for (const layout of [PHONE_LAYOUT, DESKTOP_LAYOUT]) expect(edgeFade(layout.stop)).toBe(1);
  });
  it("never land on top of each other, whichever ring is pulled and however far", () => {
    for (const layout of [PHONE_LAYOUT, DESKTOP_LAYOUT]) {
      for (let pulled = 0; pulled < 4; pulled++) {
        for (let turn = 0; turn <= requiredRotation(layout, pulled); turn += 2) {
          const shown = [0, 1, 2, 3].map((i) => visibleAngle(holeAngle(layout, i) + turn)).sort((a, b) => a - b);
          for (let k = 1; k < shown.length; k++) expect(shown[k] - shown[k - 1]).toBeGreaterThanOrEqual(layout.step - 0.001);
        }
      }
    }
  });
});

describe("pointer maths", () => {
  it("polar and pointerAngle agree with each other", () => {
    for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const p = polar(0, 0, 10, a);
      expect(pointerAngle(p.x, p.y)).toBeCloseTo(a, 6);
    }
    expect(pointerAngle(0, -5)).toBe(0); // straight up
    expect(Math.round(pointerAngle(5, 0))).toBe(90); // straight right
  });
});

describe("dragging", () => {
  it("takes the short way round across 12 o'clock", () => {
    expect(shortestDelta(350, 10)).toBe(20);
    expect(shortestDelta(10, 350)).toBe(-20);
    expect(shortestDelta(90, 90)).toBe(0);
  });
  it("only turns clockwise from rest and stops at the finger stop", () => {
    expect(advance(0, -30, 200)).toBe(0); // can't go backwards past rest
    expect(advance(100, 30, 200)).toBe(130);
    expect(advance(190, 50, 200)).toBe(200); // blocked by the stop
    expect(advance(200, -20, 200)).toBe(180); // can come back
  });
  it("remembers a pull past the stop: easing back from an overshoot still counts as at the stop", () => {
    const required = 32;
    let state = { raw: 0, turn: 0 };
    state = pull(state.raw, 57, required); // pulled 25 past the stop
    expect(state.turn).toBe(required); // the ring itself is blocked at the stop
    state = pull(state.raw, -12, required); // eased back, but still 13 past it
    expect(state.turn).toBe(required);
    expect(reachedStop(state.turn, required, 10)).toBe(true);
    state = pull(state.raw, -30, required); // eased back well short of the stop
    expect(state.turn).toBeLessThan(required - 10);
    expect(reachedStop(state.turn, required, 10)).toBe(false);
  });
  it("never lets the pointer run on more than the overshoot allowance, or below the start", () => {
    expect(pull(0, 1000, 32).raw).toBe(32 + OVERSHOOT);
    expect(pull(10, -50, 32)).toEqual({ raw: 0, turn: 0 });
  });
  it("counts as reached only at the stop", () => {
    expect(reachedStop(200, 200)).toBe(true);
    expect(reachedStop(197, 200)).toBe(true);
    expect(reachedStop(150, 200)).toBe(false);
  });
  it("spins back at a believable speed", () => {
    expect(returnSeconds(10)).toBe(0.3);
    expect(returnSeconds(360)).toBeCloseTo(1.1, 6);
    expect(returnSeconds(255)).toBeGreaterThan(returnSeconds(45));
  });
});
