import { describe, expect, it } from "vitest";
import { clampToBounds, stepBounds } from "@/lib/step-guard";

const STOPS = [100, 400, 700, 1000, 1300];
const TOL = 50;

describe("stepBounds", () => {
  it("from a resting step allows the neighbouring steps only", () => {
    expect(stepBounds(700, STOPS, TOL)).toEqual({ lo: 400, hi: 1000 });
  });

  it("counts the parked stretch around a step as resting on it", () => {
    expect(stepBounds(740, STOPS, TOL)).toEqual({ lo: 400, hi: 1000 });
    expect(stepBounds(660, STOPS, TOL)).toEqual({ lo: 400, hi: 1000 });
  });

  it("from between two steps allows the next step in either direction", () => {
    expect(stepBounds(550, STOPS, TOL)).toEqual({ lo: 400, hi: 700 });
  });

  it("leaves the ends open so the page can be left", () => {
    expect(stepBounds(100, STOPS, TOL)).toEqual({ lo: -Infinity, hi: 400 });
    expect(stepBounds(1300, STOPS, TOL)).toEqual({ lo: 1000, hi: Infinity });
  });

  it("stops a fling from outside the stage on the first or last step", () => {
    expect(stepBounds(-500, STOPS, TOL)).toEqual({ lo: -Infinity, hi: 100 });
    expect(stepBounds(2000, STOPS, TOL)).toEqual({ lo: 1300, hi: Infinity });
  });
});

describe("clampToBounds", () => {
  it("holds a scroll position between the bounds", () => {
    const b = stepBounds(700, STOPS, TOL);
    expect(clampToBounds(5000, b)).toBe(1000);
    expect(clampToBounds(-5000, b)).toBe(400);
    expect(clampToBounds(850, b)).toBe(850);
  });

  it("does not hold an open bound", () => {
    expect(clampToBounds(9000, stepBounds(1300, STOPS, TOL))).toBe(9000);
  });
});
