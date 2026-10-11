import type { PublicMember } from "./data-store";

// The home page board puts the club's leadership at the top: the President, the Vice President and the R&D Chief,
// in that order. Their Andro Points are placeholders between 300 and 400 until real sprint scores exist. They are
// derived from each person's id, so they are "random" but never change between visits, builds or servers.

export const SEED_POINTS_MIN = 300;
export const SEED_POINTS_MAX = 400;

export interface FeaturedLeader {
  id: string;
  name: string;
  avatar: string;
  domain: string;
  /** Shown under the name, e.g. "President" or "Chief, R&D". */
  title: string;
  points: number;
}

/** Small deterministic hash (cyrb53-like), so the same id always gives the same number. */
function hash(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * One distinct number in [SEED_POINTS_MIN, SEED_POINTS_MAX] per id, handed out in descending order so the first id gets the
 * highest. Distinct, so the ranking never has a tie.
 */
export function seedPoints(ids: string[]): number[] {
  const span = SEED_POINTS_MAX - SEED_POINTS_MIN + 1;
  const used = new Set<number>();
  const values = ids.map((id) => {
    let v = SEED_POINTS_MIN + (hash(id) % span);
    while (used.has(v)) v = v === SEED_POINTS_MAX ? SEED_POINTS_MIN : v + 1;
    used.add(v);
    return v;
  });
  return values.sort((a, b) => b - a);
}

/** The President, the Vice President and the R&D Chief (in that order), skipping any post nobody holds yet. */
export function featuredLeaders(members: PublicMember[]): FeaturedLeader[] {
  const president = members.find((m) => m.position === "president");
  const vice = members.find((m) => m.position === "vice_president");
  const rdChief = members.find((m) => m.position === "chief" && m.domain === "R&D");

  const picked: Array<{ member: PublicMember; title: string }> = [];
  if (president) picked.push({ member: president, title: "President" });
  if (vice) picked.push({ member: vice, title: "Vice President" });
  if (rdChief) picked.push({ member: rdChief, title: "Chief, R&D" });

  const points = seedPoints(picked.map((p) => p.member.id));
  return picked.map((p, i) => ({
    id: p.member.id,
    name: p.member.name,
    avatar: p.member.avatar,
    domain: p.member.domain,
    title: p.title,
    points: points[i],
  }));
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
