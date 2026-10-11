import { Code2, Cpu, Globe, Megaphone, Palette, Video, Trophy, CheckCircle2, Users, Zap, type LucideIcon } from "lucide-react";

// Copy and data for the home page. Edit text here; the layout lives in src/components/home.

export interface HomeDomain {
  /** Matches the domain tab on /domains (R&D uses "RD" here and "R&D" in the URL). */
  id: "Technical" | "Web" | "RD" | "Design" | "Media" | "PR";
  /** Matches the database domain name used by /api/members. */
  apiDomain: "Technical" | "Web" | "R&D" | "Design" | "Media" | "PR";
  title: string;
  subtitle: string;
  icon: LucideIcon;
  description: string;
  activities: string[];
  stats: string;
}

/** All six domains, including R&D. R&D is not recruited into directly (members are moved there later), so only the team honeycomb uses this list. */
export const HEX_DOMAINS: HomeDomain[] = [
  {
    id: "Technical", apiDomain: "Technical", title: "Technical", subtitle: "Because there's always more than one way to solve a problem.", icon: Cpu,
    description: "Technology doesn't stand still, and neither does curiosity. The Technical domain is where ideas are explored, challenges are tackled, and different approaches are put to the test. It's all about thinking beyond the obvious, learning by doing, and finding smarter ways to turn ideas into solutions.",
    activities: ["Exploring New Approaches", "Hands-on Problem Solving", "Building Smarter Solutions"], stats: "15+ Medals Won",
  },
  {
    id: "Web", apiDomain: "Web", title: "Web Development", subtitle: "The best experiences don't happen by accident.", icon: Globe,
    description: "Every great website has more going on than what meets the eye. From crafting smooth interfaces to building functional, interactive websites, this domain brings together design and code to create digital experiences that people actually enjoy using.",
    activities: ["Smooth UI Crafting", "Interactive Web Experiences", "Design Meets Code"], stats: "20+ Apps Deployed",
  },
  {
    id: "RD", apiDomain: "R&D", title: "Research & Development", subtitle: "Good ideas start conversations. Great plans make them happen.", icon: Code2,
    description: "Every memorable event starts with a spark, but turning that spark into something real takes a solid plan. R&D takes ideas from brainstorming to detailed proposals, works through the logistics, and reviews and approves events before they move forward. It's where creative thinking meets careful planning and ambitious ideas get the structure they need.",
    activities: ["Brainstorming to Proposals", "Event Planning & Logistics", "Review & Approval Process"], stats: "4 Papers Drafted",
  },
  {
    id: "Design", apiDomain: "Design", title: "Design", subtitle: "Making ideas impossible to scroll past.", icon: Palette,
    description: "First impressions matter, and design makes them count. From striking posters and event creatives to branding and visual storytelling, this domain gives Andropedia its look and feel, turning ordinary ideas into visuals that grab attention and stick in people's minds.",
    activities: ["Posters & Event Creatives", "Branding & Visual Identity", "Visual Storytelling"], stats: "100+ UI Components",
  },
  {
    id: "Media", apiDomain: "Media", title: "Media", subtitle: "The moments pass. The stories stay.", icon: Video,
    description: "The event might end, but the memories don't have to. Through photography, videography, and creative content, Media captures the energy and behind-the-scenes moments that make Andropedia special. From documenting events to creating reels and posts for our Instagram page, the domain brings the club's experiences online and keeps our community connected beyond every event.",
    activities: ["Photography & Videography", "Reels & Social Media Content", "Event Documentation"], stats: "50k+ Video Views",
  },
  {
    id: "PR", apiDomain: "PR", title: "Public Relations", subtitle: "Opening doors, one connection at a time.", icon: Megaphone,
    description: "Great ideas deserve to travel far. From building partnerships and reaching out to new communities to getting people excited about club events, PR keeps Andropedia connected, visible, and growing. It's where conversations turn into collaborations and introductions become opportunities.",
    activities: ["Building Partnerships", "Community Outreach", "Collaborations & Opportunities"], stats: "$15k+ Grants Raised",
  },
];

/** The five domains people can join, in the order they are shown: Technical, Web, Design, Media, PR. */
export const HOME_DOMAINS: HomeDomain[] = HEX_DOMAINS.filter((d) => d.id !== "RD");

export const HOME_METRICS: Array<{ label: string; value: string; icon: LucideIcon; sub: string }> = [
  { label: "Active Members", value: "48+", icon: Users, sub: "Across 5 domains" },
  { label: "Weekly Tasks Evaluated", value: "240+", icon: CheckCircle2, sub: "Strict rubric scoring" },
  { label: "Hackathon Podiums", value: "14", icon: Trophy, sub: "National & regional wins" },
  { label: "Open-Source Projects", value: "18+", icon: Zap, sub: "Deployed & live" },
];

/** Where the club's events are held. */
export const EVENT_LOCATION = "SRM Institute of Science and Technology, Ramapuram";

/**
 * The events featured on the home page. `id` matches the event on the Events page (and its photo set in
 * event-gallery.ts); `details` is the full text shown when a card is opened.
 */
export const HOME_HIGHLIGHTS = [
  {
    id: "cloudcon",
    name: "CloudCon 3.0",
    type: "Major Event",
    tag: "Flagship event",
    title: "CloudCon 3.0: Exploring the cloud. Discovering what's next.",
    date: "Past event",
    desc: "Andropedia's flagship event brought cloud computing and emerging technologies into focus, from new innovations to real-world applications.",
    details:
      "Exploring the cloud. Discovering what's next.\nAs Andropedia's flagship event, CloudCon 3.0 brought cloud computing and emerging technologies into focus. It offered students an opportunity to explore new innovations, understand real-world applications, and discover the possibilities shaping the future of technology.",
    badge: "Completed",
    cta: "View details & photos",
  },
  {
    id: "codesprint",
    name: "CodeSprint '26",
    type: "Coding Contest",
    tag: "Coding contest · TEXUS '26",
    title: "CodeSprint '26: Think fast. Code smart. Take the risk.",
    date: "Past event",
    desc: "Competitive coding with a game-inspired twist, blending programming challenges with a gambling-style mechanic that tests logic, speed and problem-solving.",
    details:
      "Think fast. Code smart. Take the risk.\nPart of TEXUS '26, CodeSprint '26 brought a game-inspired twist to competitive coding. Blending programming challenges with a gambling-style gameplay mechanic, it pushed participants to put their logic, speed, and problem-solving skills to the test in a format beyond the usual coding competition.",
    badge: "Completed",
    cta: "View details & photos",
  },
  {
    id: "cafe-hackathon",
    name: "Cafe Hackathon",
    type: "Major Event",
    tag: "Major event",
    title: "Cafe Hackathon: Big ideas. Real problems. A café full of possibilities.",
    date: "Past event",
    desc: "Club members took a hackathon out of the usual venue and into a café, brainstorming ways to improve the club and tackling real-time consultancy projects together.",
    details:
      "Big ideas. Real problems. A café full of possibilities.\nWho says hackathons have to happen in conventional venues? Cafe Hackathon brought club members together in a café for an unconventional blend of innovation, collaboration, and hands-on problem-solving. From brainstorming ideas to improve the club to tackling real-time consultancy projects, the event turned a casual setting into a space for creative thinking.",
    badge: "Completed",
    cta: "View details & photos",
  },
];

export const ABOUT_POINTS = [
  { title: "Weekly task cycles", text: "Hands-on challenges graded under comprehensive rubrics by domain leads." },
  { title: "Real-time transparency", text: "A live leaderboard that fosters healthy competition across the club." },
  { title: "Cross-domain synergy", text: "Technical, Web, Design, Media and PR working as one team." },
];

/** The week in a sprint, shown as a card on the home page (day label, title, description). */
export const SPRINT_STEPS: Array<{ day: string; title: string; text: string }> = [
  { day: "Mon", title: "Prompt released", text: "Domain leads publish this week's challenge." },
  { day: "Tue-Fri", title: "Build & submit", text: "Members ship a repo, demo or Figma file." },
  { day: "Weekend", title: "Evaluation", text: "Leads score on depth, innovation, completion, docs." },
  { day: "Sun night", title: "Leaderboard moves", text: "Points update live for the whole club." },
];
