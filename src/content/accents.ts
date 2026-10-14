import type { CSSProperties } from "react";
import type { DomainType } from "@/lib/types";

// Accent colours. The base blue, indigo, purple and teal come from the Figma file's palette
// (Foundation/Blue, Indigo, Purple, Teal); pink, amber and coral extend it so every domain
// has its own colour. `a1` is the saturated colour, `a2` a lighter tint used mid-gradient.
export interface Accent {
  name: string;
  a1: string;
  a2: string;
}

export const ACCENTS = {
  blue: { name: "blue", a1: "#0066ff", a2: "#8cbfff" },
  teal: { name: "teal", a1: "#38bdf8", a2: "#bae6fd" },
  purple: { name: "purple", a1: "#3b82f6", a2: "#93c5fd" },
  pink: { name: "pink", a1: "#0284c7", a2: "#7dd3fc" },
  amber: { name: "amber", a1: "#0052cc", a2: "#8cbfff" },
  coral: { name: "coral", a1: "#0284c7", a2: "#60a5fa" },
  indigo: { name: "indigo", a1: "#1d4ed8", a2: "#93c5fd" },
  // Only the "Join us" ring on the dial menu is red, so the call to action stands out.
  red: { name: "red", a1: "#ef4444", a2: "#fca5a5" },
} satisfies Record<string, Accent>;

export const DOMAIN_ACCENT: Record<DomainType, Accent> = {
  Technical: ACCENTS.teal,
  Web: ACCENTS.blue,
  "R&D": ACCENTS.purple,
  Design: ACCENTS.pink,
  Media: ACCENTS.amber,
  PR: ACCENTS.coral,
};

/** Inline CSS variables consumed by .text-accent, .chip-accent and friends. */
export const accentVars = (a: Accent): CSSProperties =>
  ({ "--a1": a.a1, "--a2": a.a2, "--a1-soft": `${a.a1}26`, "--a1-line": `${a.a1}66` }) as CSSProperties;

// Medal colours for ranks 1-3 on leaderboards.
export const MEDAL = ["#ffc53d", "#c9d3e0", "#e8975a"] as const;
