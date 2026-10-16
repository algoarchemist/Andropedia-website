import { describe, expect, it } from "vitest";
import { daysLeft, describeDaysLeft } from "@/lib/days-left";

// 12:00 UTC on 17 Oct is 17:30 on 17 Oct in India.
const NOW = new Date("2026-10-17T12:00:00Z");

describe("daysLeft", () => {
  it("counts whole India days to a date-only deadline", () => {
    expect(daysLeft("2026-10-20", NOW)).toBe(3);
    expect(daysLeft("2026-10-17", NOW)).toBe(0);
    expect(daysLeft("2026-10-15", NOW)).toBe(-2);
  });
  it("uses the India day for both sides, not UTC", () => {
    // 20:00 UTC on 17 Oct is already 18 Oct in India.
    expect(daysLeft("2026-10-18", new Date("2026-10-17T20:00:00Z"))).toBe(0);
  });
  it("accepts a timestamp deadline", () => {
    expect(daysLeft("2026-10-19T10:00:00Z", NOW)).toBe(2);
  });
});

describe("describeDaysLeft", () => {
  it("reads naturally", () => {
    expect(describeDaysLeft(5)).toBe("5 days left");
    expect(describeDaysLeft(1)).toBe("1 day left");
    expect(describeDaysLeft(0)).toBe("Due today");
    expect(describeDaysLeft(-1)).toBe("Overdue by 1 day");
    expect(describeDaysLeft(-4)).toBe("Overdue by 4 days");
  });
});
