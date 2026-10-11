"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Crown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BlurOrb, GridLines } from "@/components/design/Backdrop";
import { Reveal } from "@/components/design/Reveal";
import { CountUp, RevealLines, Stagger, StaggerItem } from "@/components/design/scroll";
import { MemberModal, type Selected } from "@/components/team/MemberProfile";
import { GithubIcon, LinkedinIcon } from "@/components/ui/SocialIcons";
import { HEX_DOMAINS } from "@/content/home";
import { armSoundUnlock } from "@/lib/dial-sound";
import { tileBreak, tileHover } from "@/lib/tile-sound";
import { ACCENTS, DOMAIN_ACCENT, accentVars, type Accent } from "@/content/accents";
import { POSITION_LABELS, TEAM_DOMAINS, groupTeam, type TeamMember } from "@/lib/team";
import "./team-hex.css";

// "Customers" frame from the design: a big stat, a honeycomb of glass hexagons and the core team.
// Hovering (or focusing, or tapping on a phone) a hexagon opens a popover about that domain.

const W = 630;
const H = 560;
const TILE_W = 175;
const TILE_H = 151;

/** Headline count shown on the home page. Set by hand: it does not follow the member list. */
const ACTIVE_MEMBERS = 79;

// Seven hexagons in a honeycomb: Core in the centre, the six domains around it (R&D included: members move there after joining).
const CORE_TILE = { x: 309, y: 233 };
const DOMAIN_TILES = [
  { x: 312, y: 67 },
  { x: 456, y: 153 },
  { x: 455, y: 317 },
  { x: 309, y: 396 },
  { x: 164, y: 314 },
  { x: 165, y: 151 },
];

type Place = "above" | "below" | "left" | "right";
/** Where each popover prefers to open, then what to try if that would clip. */
const CORE_PREF: Place[] = ["below", "above", "right", "left"];
const DOMAIN_PREF: Record<string, Place[]> = {
  Technical: ["above", "below", "right", "left"],
  Web: ["right", "above", "below", "left"],
  "R&D": ["below", "above", "right", "left"],
  Design: ["above", "below", "left", "right"],
  Media: ["below", "above", "left", "right"],
  PR: ["above", "below", "left", "right"],
};

const POP_W = 268;
const POP_H = 220;
const EDGE = 8;

/** The first placement whose popover stays inside the viewport. Left and right need roughly 1280px or more. */
function choosePlace(el: HTMLElement, prefs: Place[]): { place: Place; shift: number } {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const w = vw <= 700 ? 220 : POP_W;
  const cx = r.left + r.width / 2;
  const fits: Record<Place, boolean> = {
    right: r.right - 6 + POP_W <= vw - EDGE,
    left: r.left + 6 - POP_W >= EDGE,
    above: r.top - POP_H >= 72, // keeps clear of the fixed navbar
    below: true,
  };
  const place = prefs.find((p) => fits[p]) ?? (r.top > 360 ? "above" : "below");
  // Above or below: slide the card sideways so it never leaves the screen (the arrow stays on the hexagon).
  const shift = Math.max(EDGE - (cx - w / 2), Math.min(0, vw - EDGE - (cx + w / 2)));
  return { place, shift: place === "above" || place === "below" ? Math.round(shift) : 0 };
}

const pct = (n: number, total: number) => `${(n / total) * 100}%`;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

const GRADIENTS = [
  "linear-gradient(135deg,#3395ff,#af52de)",
  "linear-gradient(135deg,#ff5fa2,#ffb020)",
  "linear-gradient(135deg,#2dd4bf,#3395ff)",
  "linear-gradient(135deg,#af52de,#ff5fa2)",
  "linear-gradient(135deg,#ffb020,#ff6b57)",
  "linear-gradient(135deg,#7978de,#2dd4bf)",
];
const gradientFor = (name: string) => GRADIENTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % GRADIENTS.length];

/** Photo with an initials fallback, used in avatar stacks and person tiles. */
function Face({ member, imgAlt = "" }: { member: TeamMember; imgAlt?: string }) {
  const [failed, setFailed] = useState(false);
  if (member.avatar && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img loading="lazy" decoding="async" src={member.avatar} alt={imgAlt} onError={() => setFailed(true)} />;
  }
  return <span className="contents" aria-hidden="true">{initials(member.name)}</span>;
}

// ---------- the break: cracks run through the tile, then it shatters into six shards ----------
const CRACK_MS = 200; // cracks spread, then the tile breaks
const GO_MS = 560; // the team page opens once the shards have flown

/** Corners of the hexagon (percent of its box), the same shape as the clip-path in team-hex.css. */
const HEX_POINTS: Array<[number, number]> = [[25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50]];
/** Each shard is a triangle from the centre to one side, flying out sideways, with a different tumble. */
const SHARDS = HEX_POINTS.map((p, i) => {
  const q = HEX_POINTS[(i + 1) % 6];
  const mx = (p[0] + q[0]) / 2 - 50;
  const my = (p[1] + q[1]) / 2 - 50;
  const len = Math.hypot(mx, my) || 1;
  return {
    clip: `polygon(50% 50%, ${p[0]}% ${p[1]}%, ${q[0]}% ${q[1]}%)`,
    dx: `${Math.round((mx / len) * 70)}%`,
    dy: `${Math.round((my / len) * 70)}%`,
    rot: `${[-38, 26, 44, -22, 34, -46][i]}deg`,
    delay: `${[0, 30, 12, 45, 20, 38][i]}ms`,
  };
});

/** Jagged cracks fanning out from where the tile was clicked to each corner (viewBox 0 0 100 100). */
function crackPaths(ox: number, oy: number): string[] {
  const jag = [4, -5, 3, -4, 5, -3];
  const paths = HEX_POINTS.map(([vx, vy], i) => {
    const pt = (t: number, off: number) => {
      const x = ox + (vx - ox) * t;
      const y = oy + (vy - oy) * t;
      const nx = -(vy - oy);
      const ny = vx - ox;
      const n = Math.hypot(nx, ny) || 1;
      return `${(x + (nx / n) * off).toFixed(1)} ${(y + (ny / n) * off).toFixed(1)}`;
    };
    return `M${ox.toFixed(1)} ${oy.toFixed(1)} L${pt(0.3, jag[i])} L${pt(0.58, -jag[(i + 2) % 6])} L${pt(0.8, jag[(i + 4) % 6] * 0.6)} L${vx} ${vy}`;
  });
  // short side branches
  [0.4, 0.62, 0.5].forEach((t, i) => {
    const [vx, vy] = HEX_POINTS[i * 2];
    const bx = ox + (vx - ox) * t;
    const by = oy + (vy - oy) * t;
    paths.push(`M${bx.toFixed(1)} ${by.toFixed(1)} l${i % 2 ? -9 : 10} ${i === 1 ? -8 : 9} l${i % 2 ? -4 : 5} 6`);
  });
  return paths;
}

/** A hexagon slot. It flies in from the centre tile and settles into place when the honeycomb scrolls into view. */
function Slot({ x, y, delay, children }: { x: number; y: number; delay: number; children: React.ReactNode }) {
  const dx = ((CORE_TILE.x - x) / TILE_W) * 100;
  const dy = ((CORE_TILE.y - y) / TILE_H) * 100;
  return (
    <motion.div
      className="absolute"
      style={{ left: pct(x, W), top: pct(y, H), width: pct(TILE_W, W), aspectRatio: `${TILE_W} / ${TILE_H}` }}
      initial={{ opacity: 0, scale: 0.4, x: `${dx}%`, y: `${dy}%` }}
      whileInView={{ opacity: 1, scale: 1, x: "0%", y: "0%" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

interface HexInfo {
  key: string;
  label: string;
  href: string;
  blurb: string;
  accent: Accent;
  icon: React.ComponentType<{ className?: string }>;
  count: number | undefined;
  people: TeamMember[];
  prefs: Place[];
  cta: string;
}

interface HexProps {
  info: HexInfo;
  pos: { x: number; y: number };
  delay: number;
  open: boolean;
  onToggle: (key: string | null) => void;
}

/** One hexagon plus its popover. Hover and keyboard focus are pure CSS; a tap on a phone is handled here. */
function Hex({ info, pos, delay, open, onToggle }: HexProps) {
  const router = useRouter();
  const [placed, setPlaced] = useState<{ place: Place; shift: number }>({ place: info.prefs[0], shift: 0 });
  const [phase, setPhase] = useState<"idle" | "cracking" | "broken">("idle");
  const [cracks, setCracks] = useState<string[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  const place = (el: HTMLElement) => setPlaced(choosePlace(el, info.prefs));
  const Icon = info.icon;
  const shown = info.people.slice(0, 4);
  const more = (info.count ?? info.people.length) - shown.length;

  /** Crack the tile, break it, then open the team page. Modified clicks (new tab) and reduced motion just follow the link. */
  const breakAndGo = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      tileBreak();
      return;
    }
    e.preventDefault();
    if (phase !== "idle") return;
    const box = (e.currentTarget.closest(".th-slot")?.querySelector(".th-hexwrap") ?? e.currentTarget).getBoundingClientRect();
    const ox = box.width ? Math.min(70, Math.max(30, ((e.clientX - box.left) / box.width) * 100)) : 50;
    const oy = box.height ? Math.min(70, Math.max(30, ((e.clientY - box.top) / box.height) * 100)) : 50;
    setCracks(crackPaths(ox, oy));
    setPhase("cracking");
    tileBreak();
    onToggle(null);
    timers.current.push(window.setTimeout(() => setPhase("broken"), CRACK_MS), window.setTimeout(() => router.push(info.href), GO_MS));
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!window.matchMedia("(hover: none)").matches) return breakAndGo(e); // mouse: break the tile, then the team page
    e.preventDefault(); // touch: the first tap opens the popover
    place(e.currentTarget.closest(".th-slot") as HTMLElement);
    onToggle(open ? null : info.key);
  };

  return (
    <Slot x={pos.x} y={pos.y} delay={delay}>
      <div
        className="th-slot h-full w-full"
        data-place={placed.place}
        data-open={open || undefined}
        data-phase={phase}
        style={{ ...accentVars(info.accent), "--shift": `${placed.shift}px` } as CSSProperties}
        onPointerEnter={(e) => {
          place(e.currentTarget);
          if (e.pointerType !== "touch" && phase === "idle") tileHover();
        }}
        onFocus={(e) => place(e.currentTarget)}
      >
        <Link
          href={info.href}
          onClick={onClick}
          className="th-link th-hexwrap focus-visible:outline-none"
          aria-label={`${info.label}: ${info.count ?? 0} members`}
          aria-expanded={open}
        >
          <span className="th-hex">
            <span className="th-hexin">
              <Icon className="th-ic text-a1 h-4 w-4 sm:h-6 sm:w-6" aria-hidden="true" />
              <span className="text-accent text-[10px] font-semibold leading-3 sm:text-[14px] sm:leading-5">{info.label}</span>
              <span className="text-a2 text-[10px] leading-3 sm:text-[12px] sm:leading-[18px]">{info.count ?? "–"}</span>
            </span>
          </span>
          {phase !== "idle" && (
            <span className="th-fx" aria-hidden="true">
              <svg className="th-cracks" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
                {cracks.map((d, i) => (
                  <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i < 6 ? i * 14 : 70 + i * 12}ms` }} />
                ))}
              </svg>
              {SHARDS.map((sh, i) => (
                <span key={i} className="th-shard" style={{ "--dx": sh.dx, "--dy": sh.dy, "--rot": sh.rot, animationDelay: sh.delay } as CSSProperties}>
                  <span className="th-shard-in" style={{ clipPath: sh.clip }} />
                </span>
              ))}
            </span>
          )}
        </Link>

        <div className="th-pop" role="group" aria-label={`About ${info.label}`}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border text-a1" style={{ borderColor: "var(--a1-line)", background: "var(--a1-soft)" }}>
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h4 className="text-fade-card m-0 text-[18px] font-semibold leading-[22px]">{info.label}</h4>
              <small className="text-[12px] text-white/50">{info.count ?? 0} {info.count === 1 ? "member" : "members"}</small>
            </div>
          </div>
          <p className="my-2.5 text-[13px] leading-5 text-white/70">{info.blurb}</p>
          {shown.length > 0 && (
            <div className="th-stack" aria-hidden="true">
              {shown.map((m) => (
                <span key={m.id} className="th-av" style={{ background: gradientFor(m.name) }}><Face member={m} /></span>
              ))}
              {more > 0 && <span className="th-av more">+{more}</span>}
            </div>
          )}
          <Link href={info.href} onClick={breakAndGo} className="text-a1 inline-flex items-center gap-1.5 rounded text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70">
            {info.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Slot>
  );
}

interface TileProps {
  member: TeamMember;
  title: string;
  accent: Accent;
  big?: boolean;
  onSelect: (s: Selected) => void;
}

/** Portrait card. Hover or focus slides up the bio and links; the "View profile" button opens the profile modal. */
function PersonTile({ member, title, accent, big, onSelect }: TileProps) {
  const select = () => onSelect({ member, title, accent });
  const bio = member.bio?.trim() || `${title} at Andropedia.`;
  return (
    <StaggerItem as="li">
    <article className={`th-tile ${big ? "big" : ""}`} style={accentVars(accent)} onClick={select}>
      <span className="th-halo" aria-hidden="true" />
      {big && (
        <span className="th-crown" aria-hidden="true"><Crown className="h-4 w-4" /></span>
      )}
      <div className="th-body">
        <div className="th-photo">
          <span className="th-photo-in" style={{ background: gradientFor(member.name) }}>
            <Face member={member} />
          </span>
          <span className="th-shine" aria-hidden="true" />
        </div>
        <div className="th-meta">
          <h3>{member.name}</h3>
          <p className="th-role">{title}</p>
        </div>
      </div>
      <div className="th-peek">
        <p>{bio}</p>
        <div className="th-peek-row" onClick={(e) => e.stopPropagation()}>
          {member.github && (
            <a href={member.github} target="_blank" rel="noreferrer" className="th-soc" aria-label={`${member.name} on GitHub`}>
              <GithubIcon className="h-3.5 w-3.5" />
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noreferrer" className="th-soc" aria-label={`${member.name} on LinkedIn`}>
              <LinkedinIcon className="h-3.5 w-3.5" />
            </a>
          )}
          <button type="button" className="th-view" onClick={select} aria-label={`View ${member.name}'s profile`}>
            View profile <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
    </StaggerItem>
  );
}

export function TeamHex() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => armSoundUnlock(), []); // hover sounds start after the first click or key press

  useEffect(() => {
    let cancelled = false;
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setMembers(d.members);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // A tapped popover closes on Escape or a tap anywhere else.
  useEffect(() => {
    if (!openKey) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenKey(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest(".th-slot")) setOpenKey(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [openKey]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (members ?? []).forEach((m) => (c[m.domain] = (c[m.domain] ?? 0) + 1));
    return c;
  }, [members]);
  const groups = useMemo(() => (members ? groupTeam(members) : null), [members]);
  const core = useMemo(() => (groups ? [...groups.president, ...groups.vicePresident, ...groups.chiefs] : []), [groups]);
  const domainLabel = (id: string) => TEAM_DOMAINS.find((d) => d.id === id)?.label ?? id;

  const coreInfo: HexInfo = {
    key: "core",
    label: "Core",
    href: "/team#core",
    blurb: "President, Vice President and the domain chiefs.",
    accent: ACCENTS.indigo,
    icon: Crown,
    count: members ? core.length : undefined,
    people: core,
    prefs: CORE_PREF,
    cta: "Meet the Core team",
  };
  const domainInfos: HexInfo[] = HEX_DOMAINS.map((d) => {
    const td = TEAM_DOMAINS.find((x) => x.id === d.apiDomain);
    const people = (members ?? [])
      .filter((m) => m.domain === d.apiDomain)
      .sort((a, b) => Number(Boolean(b.avatar)) - Number(Boolean(a.avatar)));
    return {
      key: d.id,
      label: d.apiDomain,
      href: `/team#${td?.slug ?? ""}`,
      blurb: td?.blurb ?? d.subtitle,
      accent: DOMAIN_ACCENT[d.apiDomain],
      icon: d.icon,
      count: counts[d.apiDomain],
      people,
      prefs: DOMAIN_PREF[d.apiDomain] ?? ["below", "above", "right", "left"],
      cta: `Meet the ${d.apiDomain} team`,
    };
  });

  const tileProps = { onSelect: (s: Selected) => setSelected(s) };

  return (
    <section id="team" className="relative isolate overflow-x-clip bg-black px-5 py-24 sm:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[12%] h-[70%] opacity-60" style={{ backgroundImage: "url(/design/bg/spiral.webp)", backgroundSize: "cover", backgroundPosition: "center" }} />
      <GridLines variant="customers" />
      <BlurOrb variant="customers" size={613} opacity={0.5} position={{ left: "50%", top: "52%" }} />
      <BlurOrb variant="customers-soft" size={600} opacity={0.3} position={{ left: "50%", top: "52%" }} />

      <div className="relative mx-auto max-w-[1240px]">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-6">
          {/* Left: the pitch */}
          <div className="space-y-5 xl:space-y-6">
            <Reveal className="space-y-3.5">
              <p className="chip font-mono !text-[11px] !px-3 !py-1 uppercase tracking-[0.14em]">Our Community</p>
              <RevealLines className="font-mono text-[30px] font-bold uppercase leading-[1.08] tracking-tight sm:text-[38px] lg:text-[44px] xl:text-[48px]">
                <span className="text-fade">Meet the people</span>
                <span className="text-aurora">behind Andropedia</span>
              </RevealLines>
              <p className="max-w-[480px] text-[14px] leading-relaxed text-white/75 sm:text-[15px]">
                A collective of developers, designers, researchers, and creators pushing boundaries across SRMIST and shipping real-world software.
              </p>
            </Reveal>

            <Reveal delay={0.1} className="flex items-baseline gap-4">
              <span className="text-aurora font-mono text-[56px] font-black leading-none tracking-[-3px] sm:text-[68px] lg:text-[76px]" aria-label={`${ACTIVE_MEMBERS} active members`}>
                <CountUp value={String(ACTIVE_MEMBERS)} duration={1.8} />
              </span>
              <div className="space-y-0.5">
                <p className="font-mono text-[15px] font-bold uppercase tracking-wider text-white sm:text-[17px]">Active Members</p>
                <p className="text-[12px] text-white/50 sm:text-[13px]">Across {TEAM_DOMAINS.length} specialised technical domains</p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="flex flex-wrap gap-2">
                {HEX_DOMAINS.map((d) => (
                  <span key={d.id} className="chip-accent font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5">
                    {d.title}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.22}>
              <Link href="/team" className="btn-glow inline-flex items-center gap-2.5 !px-6 !py-3 font-mono text-[13px] font-bold uppercase tracking-wider" data-cursor-text="Team">
                Meet the full team <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>

          {/* Right: honeycomb, nudged to the right. Each hexagon pops out of the centre as it scrolls into view. */}
          <div className="th-comb relative mx-auto w-full max-w-[520px] lg:ml-auto lg:mr-0 lg:max-w-[560px] lg:translate-x-8 xl:translate-x-14" style={{ aspectRatio: `${W} / ${H}` }}>
            <Hex info={coreInfo} pos={CORE_TILE} delay={0} open={openKey === coreInfo.key} onToggle={setOpenKey} />
            {domainInfos.map((info, i) => (
              <Hex key={info.key} info={info} pos={DOMAIN_TILES[i]} delay={0.25 + i * 0.09} open={openKey === info.key} onToggle={setOpenKey} />
            ))}
          </div>
        </div>

        {/* Core team */}
        <Reveal className="mx-auto mt-16 max-w-[900px] space-y-6">
          {groups && core.length > 0 && (
            <div className="th-roster space-y-4">
              {(groups.president.length > 0 || groups.vicePresident.length > 0) && (
                <Stagger as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2" stagger={0.07}>
                  {groups.president.map((m) => <PersonTile key={m.id} member={m} big title={POSITION_LABELS.president} accent={ACCENTS.amber} {...tileProps} />)}
                  {groups.vicePresident.map((m) => <PersonTile key={m.id} member={m} big title={POSITION_LABELS.vice_president} accent={ACCENTS.purple} {...tileProps} />)}
                </Stagger>
              )}
              {groups.chiefs.length > 0 && (
                <Stagger as="ul" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2" stagger={0.07}>
                  {groups.chiefs.map((m) => <PersonTile key={m.id} member={m} title={`Chief, ${domainLabel(m.domain)}`} accent={DOMAIN_ACCENT[m.domain]} {...tileProps} />)}
                </Stagger>
              )}
            </div>
          )}
          <div className="flex justify-center">
            <Link href="/team" className="btn-glass" data-cursor-text="Team">
              Meet the full team <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>

      <AnimatePresence>
        {selected && (
          <MemberModal selected={selected} domainLabel={domainLabel(selected.member.domain)} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
