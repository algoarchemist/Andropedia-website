import { Cpu, Clapperboard, Flag, Globe, IdCard, Megaphone, Palette, ScrollText, Sparkles, Swords, type LucideIcon } from "lucide-react";
import type { DomainId } from "@/lib/recruitment/questions";
import type { DomainType } from "@/lib/types";

// Cosmetic game layer for the application form. Nothing here is sent to the server.

export const LEVEL_XP = 100;
export const BONUS_XP = 10;

export interface Level {
  label: string;
  /** Fits under a tile on a phone. */
  short: string;
  icon: LucideIcon;
}

export const LEVELS: Level[] = [
  { label: "Basics", short: "Basics", icon: IdCard },
  { label: "Vibe check", short: "Vibe", icon: Sparkles },
  { label: "Choose domain", short: "Class", icon: Swords },
  { label: "Domain round", short: "Round", icon: Flag },
  { label: "Review", short: "Review", icon: ScrollText },
];

/** Most XP an applicant can see: every level plus one optional question. */
export const MAX_XP = LEVELS.length * LEVEL_XP + BONUS_XP;

export interface DomainClass {
  /** Playful class name. */
  title: string;
  tagline: string;
  icon: LucideIcon;
  type: DomainType;
}

export const DOMAIN_CLASS: Record<DomainId, DomainClass> = {
  technical: { title: "Kernel Knight", tagline: "Slays segfaults, speaks fluent pointer.", icon: Cpu, type: "Technical" },
  web: { title: "Web Wizard", tagline: "Conjures pages out of divs and stubbornness.", icon: Globe, type: "Web" },
  design: { title: "Pixel Alchemist", tagline: "Turns chaos and kerning into gold.", icon: Palette, type: "Design" },
  media: { title: "Frame Rogue", tagline: "Steals the perfect shot before it escapes.", icon: Clapperboard, type: "Media" },
  pr: { title: "Hype Bard", tagline: "Talks sponsors into saying yes.", icon: Megaphone, type: "PR" },
};

/** Thambi's lines. Index = level. */
export const ANDY_HI = [
  "Hi, I'm Thambi! Tell me who you are and we're off.",
  "Two quick ones. There are no wrong answers, only revealing ones.",
  "Pick your class. It decides your round and the team that reads you.",
  "Boss round! Be specific, we read every word.",
  "Last stop. Check your player card, then take the pledge.",
];
export const ANDY_CHEER = [
  "Level 1 cleared! +100 XP.",
  "Vibes verified. +100 XP!",
  "Class locked in. Good choice.",
  "Round cleared! Only the review is left.",
  "",
];

export const DEFAULT_STARTERS = ["Honestly, ", "The first thing I would do is ", "Last time this happened, "];

/** Sentence starters per textarea question. */
export const STARTERS: Record<string, string[]> = {
  media_trend: ["The trend that breaks me is ", "Everyone is doing ", "If I never hear ", "Nobody asked for "],
  design_logo_pop: ["I take a slow breath and ", "First, I ask ", "Politely, I explain that "],
  design_font_defence: ["Clearly, ", "My defence rests on ", "Hear me out: "],
  pr_pitch: ["Dear sponsor, ", "Imagine 500 students who ", "For one logo on a banner, you get "],
  pr_crisis: ["Within five minutes I would ", "First, I tell the room ", "The announcement: "],
  pr_brag: ["I once handled ", "My proudest moment was ", "Without me, "],
  tech_git_dog: ["Good boy, imagine two ", "Picture a ball that ", "Two people tried to "],
  tech_stack: ["I am solid in ", "I have shipped projects in ", "Comfortable with "],
  tech_weird_project: ["Once, at 2am, I built ", "My strangest project is ", "It started as a joke and "],
  web_center_div: ["Obviously with ", "display: flex and ", "I would simply "],
  web_faction_reason: ["Without us, ", "Everything the user sees depends on ", "Fact: "],
  web_deploy_fail: ["It was definitely ", "Rollback plan: ", "Step one, "],
  web_showcase: ["https://github.com/", "https://", "Live: "],
};
