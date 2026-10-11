import { describe, expect, it } from "vitest";
import { SEED_POINTS_MAX, SEED_POINTS_MIN, featuredLeaders, initialsOf, seedPoints } from "@/lib/home-board";
import type { PublicMember } from "@/lib/data-store";

const member = (over: Partial<PublicMember>): PublicMember => ({ id: "x", name: "X", role: "member", domain: "Web", avatar: "", position: "member", ...over }) as PublicMember;

describe("seedPoints", () => {
  it("stays within 300-400 and is the same every time", () => {
    const ids = ["a", "b", "c"];
    const first = seedPoints(ids);
    expect(seedPoints(ids)).toEqual(first);
    for (const p of first) {
      expect(p).toBeGreaterThanOrEqual(SEED_POINTS_MIN);
      expect(p).toBeLessThanOrEqual(SEED_POINTS_MAX);
    }
  });
  it("gives distinct values, highest first, so there are never ties", () => {
    for (const ids of [["a", "b", "c"], ["same", "same", "same"], ["1", "2", "3", "4", "5", "6", "7", "8"]]) {
      const p = seedPoints(ids);
      expect(new Set(p).size).toBe(p.length);
      expect([...p].sort((a, b) => b - a)).toEqual(p);
    }
  });
  it("looks random: different ids do not all land on the same value", () => {
    const values = new Set(Array.from({ length: 30 }, (_, i) => seedPoints([`user-${i}`])[0]));
    expect(values.size).toBeGreaterThan(15);
  });
});

describe("featuredLeaders", () => {
  const team = [
    member({ id: "m1", name: "A Member" }),
    member({ id: "c1", name: "Web Chief", position: "chief", domain: "Web" }),
    member({ id: "c2", name: "RD Chief", position: "chief", domain: "R&D" }),
    member({ id: "vp", name: "Vee Pee", position: "vice_president", domain: "Technical" }),
    member({ id: "p", name: "Prez", position: "president", domain: "Technical" }),
  ];

  it("picks the President, the Vice President and the R&D Chief, in that order, ranked by points", () => {
    const leaders = featuredLeaders(team);
    expect(leaders.map((l) => [l.name, l.title])).toEqual([["Prez", "President"], ["Vee Pee", "Vice President"], ["RD Chief", "Chief, R&D"]]);
    expect(leaders[0].points).toBeGreaterThan(leaders[1].points);
    expect(leaders[1].points).toBeGreaterThan(leaders[2].points);
  });
  it("ignores chiefs of other domains and skips posts nobody holds", () => {
    expect(featuredLeaders([member({ id: "c1", position: "chief", domain: "Web" })])).toEqual([]);
    expect(featuredLeaders(team.filter((m) => m.id !== "vp")).map((l) => l.title)).toEqual(["President", "Chief, R&D"]);
  });
});

describe("initialsOf", () => {
  it("uses the first letters of the first two words", () => {
    expect(initialsOf("Sai Vishnu Kandur C")).toBe("SV");
    expect(initialsOf("SANTHOSH S")).toBe("SS");
    expect(initialsOf("")).toBe("?");
  });
});
