import type { CSSProperties } from "react";
import type { DomainType } from "@/lib/types";
import type { TeamMember } from "@/lib/team";

// Colours for the member cards and profile popup (see "Member Profile Card Wireframe").
// Each domain gets its own colour so no two domains share a blue; the President and Vice President
// get the site's aurora (white, cyan and electric blue).
//   a1 saturated colour   a2 light tint   d dark end of the banner   soft/line tints for fills and borders
export interface TeamTheme {
  label: string;
  a1: string;
  a2: string;
  d: string;
  soft: string;
  line: string;
  /** Banner gradient. Falls back to a1 → d → black. */
  banner?: string;
  /** Colour of the role chip's fill: the domain colour, or white for the core team. */
  chipFill?: string;
}

const theme = (label: string, a1: string, a2: string, d: string, rgb: string, line = 0.45): TeamTheme => ({
  label,
  a1,
  a2,
  d,
  soft: `rgba(${rgb},.16)`,
  line: `rgba(${rgb},${line})`,
});

export const DOMAIN_THEME: Record<DomainType, TeamTheme> = {
  Technical: theme("Technical", "#38bdf8", "#bae6fd", "#0c4a6e", "56,189,248"),
  Web: theme("Web", "#3388ff", "#b3d4ff", "#0a2e66", "51,136,255"),
  "R&D": theme("R&D", "#8b9bff", "#d0d6ff", "#2a2f73", "139,155,255"),
  Design: theme("Design", "#5eead4", "#ccfbf1", "#0f4d44", "94,234,212"),
  PR: theme("PR", "#ff8f6b", "#ffd2c2", "#6b2a16", "255,143,107"),
  Media: theme("Media", "#ffc53d", "#ffe9b0", "#6b4a00", "255,197,61"),
};

export const CORE_THEME: TeamTheme = {
  ...theme("Core", "#38bdf8", "#e0f2fe", "#0a2e66", "56,189,248", 0.5),
  banner: "linear-gradient(110deg,#0044cc 0%,#0066ff 35%,#38bdf8 75%,#e0f2fe 100%)",
  chipFill: "#ffffff",
};

/** President and Vice President use the core theme; everyone else takes their domain's. */
export function themeFor(member: Pick<TeamMember, "domain" | "position">): TeamTheme {
  if (member.position === "president" || member.position === "vice_president") return CORE_THEME;
  return DOMAIN_THEME[member.domain] ?? CORE_THEME;
}

/** Inline CSS variables read by the .tc-* classes in globals.css. */
export const themeVars = (t: TeamTheme): CSSProperties =>
  ({
    "--t1": t.a1,
    "--t2": t.a2,
    "--td": t.d,
    "--ts": t.soft,
    "--tl": t.line,
    "--tb": t.banner ?? `linear-gradient(120deg,${t.a1} 0%,${t.d} 62%,#000 100%)`,
    "--tf": t.chipFill ?? t.a1,
  }) as CSSProperties;
