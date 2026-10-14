"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users, Crown, Shield, Star } from "lucide-react";
import { AvatarRing, MemberModal, Socials, type Selected } from "@/components/team/MemberProfile";
import { SoundButton } from "@/components/ui/SoundButton";
import ProfileCard from "@/components/ui/ProfileCard";
import { GithubIcon, InstagramIcon, LinkedinIcon } from "@/components/ui/SocialIcons";
import { armSoundUnlock } from "@/lib/dial-sound";
import { cardClick, cardGlow, cardHover } from "@/lib/tile-sound";
import { accentVars } from "@/content/accents";
import { DOMAIN_THEME, themeFor, themeVars } from "@/content/team-theme";
import { getCachedMembers, setCachedMembers } from "@/lib/members-cache";
import { POSITION_LABELS, TEAM_DOMAINS, groupTeam, type TeamMember } from "@/lib/team";

type Size = "large" | "medium" | "compact";

type Select = (m: TeamMember, title: string | undefined) => void;

const hoverSpring = { type: "spring", stiffness: 320, damping: 22 } as const;

/** Headings take the same colour as the domain's cards. */
const sectionAccent = (id: keyof typeof DOMAIN_THEME) => accentVars({ name: id, a1: DOMAIN_THEME[id].a1, a2: DOMAIN_THEME[id].a2 });

/** GitHub, LinkedIn and Instagram: only the ones the member has. */
function SocialRow({ member }: { member: TeamMember }) {
  const links = [
    { url: member.github, label: "GitHub", Icon: GithubIcon },
    { url: member.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
    { url: member.instagram, label: "Instagram", Icon: InstagramIcon },
  ].filter((l) => l.url);
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {links.map(({ url, label, Icon }) => (
        <a key={label} href={url!} target="_blank" rel="noreferrer" className="tc-sq tc-sq-sm" aria-label={`${member.name} on ${label}`}>
          <Icon className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}

/** A stand-in photo for members without one: their initials on the card's colour, as an inline SVG. */
const initialsPhoto = (name: string, a1: string, d: string) => {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a1}'/><stop offset='1' stop-color='${d}'/></linearGradient></defs><rect width='400' height='500' fill='url(#g)'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-family='monospace' font-weight='700' font-size='150' fill='white' fill-opacity='.9'>${letters}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * `title` is the line under the name, e.g. "President" or "Chief, Technical". Click or Enter opens the profile.
 * Hovering lights the card up from the pointer; clicking sends a ripple of light and a flash across it, with a sound.
 */
const MemberCard = memo(function MemberCard({ member, size, title, className = "", onSelect }: { member: TeamMember; size: Size; title?: string; className?: string; onSelect: Select }) {
  const theme = themeFor(member);
  const card = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ id: number; x: number; y: number } | null>(null);

  const open = (x: number, y: number) => {
    const el = card.current;
    if (el) {
      // Restart the flash even if the previous one is still running.
      el.classList.remove("tc-lit");
      void el.offsetWidth;
      el.classList.add("tc-lit");
    }
    setRipple({ id: performance.now(), x, y });
    onSelect(member, title);
    // The sound waits until the profile has had its first frame, so starting audio never delays it.
    requestAnimationFrame(() =>
      window.setTimeout(() => {
        cardClick();
        cardGlow();
      }, 0),
    );
  };
  const interactive = {
    ref: card,
    role: "button" as const,
    tabIndex: 0,
    "aria-haspopup": "dialog" as const,
    "aria-label": `Open ${member.name}'s profile`,
    style: themeVars(theme),
    "data-cursor-text": "View profile",
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      open(e.clientX - r.left, e.clientY - r.top);
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") cardHover();
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    },
    onAnimationEnd: (e: React.AnimationEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove("tc-lit");
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        open(r.width / 2, r.height * 0.35);
      }
    },
    whileHover: { y: -6, scale: 1.025 },
    whileTap: { scale: 0.985 },
    transition: hoverSpring,
  };
  const burst = ripple && (
    <span key={ripple.id} aria-hidden="true" className="tc-ripple" style={{ left: ripple.x, top: ripple.y }} onAnimationEnd={() => setRipple(null)} />
  );

  const large = size === "large";
  if (size === "compact") {
    return (
      <motion.div {...interactive} className="group tc tc-row cursor-pointer">
        <AvatarRing member={member} ringClass="tc-ring-sm" textClass="text-sm" />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold uppercase leading-5 text-white">{member.name}</h4>
          <span className="tc-chip">{theme.label}</span>
        </div>
        <Socials member={member} size="sm" />
        <span className="tc-bar" aria-hidden="true" />
        {burst}
      </motion.div>
    );
  }

  // President, Vice President, Chiefs, Leads and Co-Leads get the tilting, holographic React Bits profile card. Click it (or its
  // Profile button) to open the full profile, with the same ripple and sound as the other cards.
  const photo = member.avatar || initialsPhoto(member.name, theme.a1, theme.d);
  const handleOf = (url?: string | null) => url?.replace(/\/+$/, "").split("/").pop()?.replace(/^@/, "") || "";
  return (
    <div
      ref={card}
      className={`tc-pcard relative flex justify-center ${className}`}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`Open ${member.name}'s profile`}
      data-cursor-text="View profile"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        open(e.clientX - r.left, e.clientY - r.top);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") cardHover();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          open(r.width / 2, r.height * 0.35);
        }
      }}
    >
      <ProfileCard
        name={member.name.toUpperCase()}
        title={title ?? theme.label}
        avatarUrl={photo}
        miniAvatarUrl={photo}
        handle={handleOf(member.github) || handleOf(member.instagram) || member.name.split(/\s+/)[0].toLowerCase()}
        status={theme.label}
        statusColor={theme.a1}
        actions={<SocialRow member={member} />}
        backdropColor={theme.d}
        theme="dark"
        radius={18}
        className={large ? "w-full max-w-[340px]" : "w-full max-w-[300px]"}
      />
      {burst}
    </div>
  );
});


function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-white/50 text-center py-6 border border-dashed border-white/15 rounded-xl">{children}</p>;
}

function SubHeading({ icon: Icon, children }: { icon: typeof Crown; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-slate-400">
      <Icon className="text-a1 h-3.5 w-3.5" />
      {children}
    </h3>
  );
}

// Runs before the browser paints, so the page is already at the right place on the first frame (falls back to a normal effect on the server).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function TeamPage() {
  // Starts from the list the home page already fetched, if there is one, so the sections exist on the very first render.
  const [members, setMembers] = useState<TeamMember[] | null>(() => getCachedMembers());
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  // Stable, so the 49 memoised cards don't re-render when a profile opens.
  const select: Select = useCallback((member, title) => setSelected({ member, title }), []);
  const closeProfile = useCallback(() => setSelected(null), []);

  useEffect(() => armSoundUnlock(), []); // hover sounds start after the first click or key press

  useEffect(() => {
    let cancelled = false;
    fetch("/api/members", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setCachedMembers(data.members);
          setMembers(data.members);
        } else if (!getCachedMembers()) setLoadError(true);
      })
      .catch(() => !cancelled && !getCachedMembers() && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => (members ? groupTeam(members) : null), [members]);

  // The sections only exist once the members are there, so a link like /team#pr has to be followed after that. Arriving on the page
  // jumps straight to the section; the jump links at the top then slide.
  const ready = groups !== null;
  const arrived = useRef(false);
  useIsoLayoutEffect(() => {
    if (!ready) return;
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: arrived.current ? "smooth" : "instant", block: "start" });
      arrived.current = true;
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [ready]);
  // Still loading and heading for a section: wait at the top, not wherever the previous page was scrolled to (the footer of a short page).
  useIsoLayoutEffect(() => {
    if (!ready && window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [ready]);
  const domainLabel = (id: string) => TEAM_DOMAINS.find((d) => d.id === id)?.label ?? id;
  const hasCore = groups && (groups.president.length || groups.vicePresident.length || groups.chiefs.length);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-black text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="relative max-w-6xl mx-auto space-y-14">
        {/* Header */}
        <header className="text-center max-w-3xl mx-auto space-y-4">
          <div className="chip">
            <Users className="w-3.5 h-3.5" />
            OUR TEAM
          </div>
          <h1 className="font-mono text-[36px] sm:text-[54px] lg:text-[62px] font-bold uppercase leading-[1.08] tracking-tight">
            <span className="text-fade">Meet the people of </span>
            <span className="text-aurora">Andropedia</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-base font-sans max-w-2xl mx-auto">
            The core team that runs the club, and the leads, co-leads and members of every domain.
          </p>
          <SoundButton />
        </header>

        {/* Jump links */}
        <nav aria-label="Team sections" className="sticky top-[60px] z-30 -mx-4 px-4 py-2.5 bg-black/80 backdrop-blur-xl border-y border-white/10">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {[{ href: "#core", label: "Core" }, ...TEAM_DOMAINS.map((d) => ({ href: `#${d.slug}`, label: d.label }))].map((l) => (
              <li key={l.href}>
                <a href={l.href} className="pill-link font-mono uppercase tracking-wider !px-3.5 !py-1.5 !text-[12px] border border-white/10 hover:border-sky-400/50 hover:text-sky-300">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {loadError && (
          <p role="alert" className="text-center text-sm text-amber-300">
            We couldn&apos;t load the team right now. Please refresh in a moment.
          </p>
        )}
        {!groups && !loadError && (
          <p className="text-center text-xs font-mono uppercase tracking-[0.18em] text-slate-500">Loading the team...</p>
        )}

        {groups && (
          <>
            {/* ---------- Core ---------- */}
            <section id="core" className="scroll-mt-32 space-y-8" aria-label="Core team">
              <div className="text-center space-y-1">
                <h2 className="text-aurora font-mono text-[30px] sm:text-[42px] font-bold uppercase leading-tight tracking-tight">Core team</h2>
                <p className="text-sm text-white/60">President, Vice President and the Chief of every domain.</p>
              </div>

              {!hasCore && <Empty>The core team will be announced soon.</Empty>}

              {(groups.president.length > 0 || groups.vicePresident.length > 0) && (
                <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-stretch justify-center gap-6">
                  {groups.president.map((m) => (
                    <MemberCard key={m.id} onSelect={select} member={m} size="large" title={POSITION_LABELS.president} />
                  ))}
                  {groups.vicePresident.map((m) => (
                    <MemberCard key={m.id} onSelect={select} member={m} size="large" title={POSITION_LABELS.vice_president} />
                  ))}
                </div>
              )}

              {groups.chiefs.length > 0 && (
                <div className="space-y-4">
                  <SubHeading icon={Crown}>Chiefs</SubHeading>
                  <div className="mx-auto flex max-w-[38rem] flex-wrap justify-center gap-5">
                    {groups.chiefs.map((m) => (
                      <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`Chief, ${domainLabel(m.domain)}`} className="w-full sm:w-72" />
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ---------- Domains ---------- */}
            {groups.domains.map(({ domain, leads, coLeads, members: regular, total }) => (
              <section key={domain.id} id={domain.slug} className="scroll-mt-32 space-y-6" style={sectionAccent(domain.id)} aria-label={`${domain.label} team`}>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-accent font-mono text-[28px] sm:text-[38px] font-bold uppercase leading-tight tracking-tight">{domain.label}</h2>
                    <p className="text-sm text-white/70">{domain.blurb}</p>
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider text-sky-400">{total} {total === 1 ? "member" : "members"}</span>
                </div>

                {total === 0 ? (
                  <Empty>No one is listed in {domain.label} yet.</Empty>
                ) : (
                  <>
                    {/* Lead and Co-Lead sit side by side. With two or more Co-Leads they get a row each instead. */}
                    {coLeads.length < 2 && leads.length + coLeads.length > 0 ? (
                      <div className="space-y-3">
                        <SubHeading icon={Shield}>
                          {[leads.length > 1 ? "Leads" : leads.length === 1 ? "Lead" : "", coLeads.length === 1 ? "Co-Lead" : ""].filter(Boolean).join(" & ")}
                        </SubHeading>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {leads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.lead}, ${domain.label}`} />)}
                          {coLeads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.co_lead}, ${domain.label}`} />)}
                        </div>
                      </div>
                    ) : (
                      <>
                        {leads.length > 0 && (
                          <div className="space-y-3">
                            <SubHeading icon={Shield}>{leads.length > 1 ? "Leads" : "Lead"}</SubHeading>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {leads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.lead}, ${domain.label}`} />)}
                            </div>
                          </div>
                        )}
                        {coLeads.length > 0 && (
                          <div className="space-y-3">
                            <SubHeading icon={Star}>Co-Leads</SubHeading>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {coLeads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.co_lead}, ${domain.label}`} />)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {regular.length > 0 && (
                      <div className="space-y-3">
                        <SubHeading icon={Users}>Members</SubHeading>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {regular.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="compact" />)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            ))}
          </>
        )}
      </div>
      <AnimatePresence>
        {selected && <MemberModal selected={selected} domainLabel={domainLabel(selected.member.domain)} onClose={closeProfile} />}
      </AnimatePresence>
    </div>
  );
}
