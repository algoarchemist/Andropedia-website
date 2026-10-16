import { describe, expect, it } from "vitest";
import { istDay, loginStreak, previousDay } from "@/lib/login-streak";

describe("istDay", () => {
  it("uses the India calendar day, not UTC", () => {
    // 20:00 UTC on 16 Oct is 01:30 on 17 Oct in India.
    expect(istDay(new Date("2026-10-16T20:00:00Z"))).toBe("2026-10-17");
    expect(istDay(new Date("2026-10-16T18:00:00Z"))).toBe("2026-10-16");
  });
});

describe("previousDay", () => {
  it("steps back across month and year ends", () => {
    expect(previousDay("2026-10-17")).toBe("2026-10-16");
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
    expect(previousDay("2027-01-01")).toBe("2026-12-31");
  });
});

describe("loginStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(loginStreak(["2026-10-15", "2026-10-16", "2026-10-17"], "2026-10-17")).toBe(3);
  });
  it("stops at the first missed day", () => {
    expect(loginStreak(["2026-10-12", "2026-10-16", "2026-10-17"], "2026-10-17")).toBe(2);
  });
  it("keeps yesterday's streak until today is over", () => {
    expect(loginStreak(["2026-10-15", "2026-10-16"], "2026-10-17")).toBe(2);
  });
  it("is 0 after a missed day, or with no logins", () => {
    expect(loginStreak(["2026-10-14"], "2026-10-17")).toBe(0);
    expect(loginStreak([], "2026-10-17")).toBe(0);
  });
  it("counts a day once however many times it is listed", () => {
    expect(loginStreak(["2026-10-17", "2026-10-17"], "2026-10-17")).toBe(1);
  });
});
