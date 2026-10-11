"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Users, Crown, Shield, Star } from "lucide-react";
import { Avatar, MemberModal, Socials, type Selected } from "@/components/team/MemberProfile";
import { SoundButton } from "@/components/ui/SoundButton";
import { armSoundUnlock } from "@/lib/dial-sound";
import { cardClick, cardHover } from "@/lib/tile-sound";
import { ACCENTS, DOMAIN_ACCENT, accentVars, type Accent } from "@/content/accents";
import { POSITION_LABELS, TEAM_DOMAINS, groupTeam, type TeamMember } from "@/lib/team";

type Size = "large" | "medium" | "compact";


type Select = (m: TeamMember, title: string | undefined, accent: Accent | undefined) => void;

const hoverSpring = { type: "spring", stiffness: 320, damping: 22 } as const;

/** `title` is the line under the name, e.g. "President" or "Chief, Technical". Click or Enter opens the profile. */
const MemberCard = memo(function MemberCard({ member, size, title, className = "", accent, onSelect }: { member: TeamMember; size: Size; title?: string; className?: string; accent?: Accent; onSelect: Select }) {
  const open = () => {
    onSelect(member, title, accent);
    // The sound waits until the profile has had its first frame, so starting audio never delays it.
    requestAnimationFrame(() => window.setTimeout(cardClick, 0));
  };
  const interactive = {
    role: "button" as const,
    tabIndex: 0,
    "aria-haspopup": "dialog" as const,
    "aria-label": `Open ${member.name}'s profile`,
    onClick: open,
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") cardHover();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    },
    whileHover: { y: -6, scale: 1.025 },
    whileTap: { scale: 0.985 },
    transition: hoverSpring,
  };

  if (size === "compact") {
    return (
      <motion.div
        {...interactive}
        className="group dark-card p-4 flex items-center gap-3 cursor-pointer hover:border-white/30 hover:shadow-[0_10px_30px_-10px_rgba(255,255,255,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
        data-cursor-text="View profile"
      >
        <Avatar member={member} className="w-12 h-12 rounded-xl border border-white/10 shrink-0 text-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-4deg]" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold uppercase text-white truncate">{member.name}</h4>
          {member.bio && <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{member.bio}</p>}
        </div>
        <Socials member={member} />
      </motion.div>
    );
  }

  const large = size === "large";
  return (
    <motion.div
      {...interactive}
      className={`group glass-card glass-card-sm is-interactive relative flex flex-col items-center text-center cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 ${large ? "p-10 w-full sm:w-[24rem]" : "p-6"} ${className}`}
      data-cursor-text="View profile"
      style={accent ? accentVars(accent) : undefined}
    >
      {/* Accent glow that fades in under the cursor */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(60% 50% at 50% 0%, var(--a1-soft, rgba(255,255,255,0.12)), transparent 70%)" }} />
      <Avatar
        member={member}
        className={`${large ? "w-36 h-36 text-4xl" : "w-20 h-20 text-xl"} rounded-2xl border border-white/30 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
      />
      <h3 className={`${large ? "text-2xl" : "text-lg"} font-bold uppercase text-white mt-5`}>{member.name}</h3>
      {title && <p className="text-a2 mt-1 text-[13px] font-medium leading-5">{title}</p>}
      {member.bio && <p className="text-xs text-slate-400 leading-relaxed mt-3 line-clamp-3">{member.bio}</p>}
      <div className="mt-4"><Socials member={member} /></div>
      <span className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/0 transition-colors duration-300 group-hover:text-white/70">View profile</span>
    </motion.div>
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

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  // Stable, so the 49 memoised cards don't re-render when a profile opens.
  const select: Select = useCallback((member, title, accent) => setSelected({ member, title, accent }), []);
  const closeProfile = useCallback(() => setSelected(null), []);

  useEffect(() => armSoundUnlock(), []); // hover sounds start after the first click or key press

  useEffect(() => {
    let cancelled = false;
    fetch("/api/members", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) setMembers(data.members);
        else setLoadError(true);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => (members ? groupTeam(members) : null), [members]);

  // The sections only exist once the members have loaded, so a link like /team#pr has to be followed after that.
  const ready = groups !== null;
  useEffect(() => {
    if (!ready) return;
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
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
                    <MemberCard key={m.id} onSelect={select} member={m} size="large" title={POSITION_LABELS.president} accent={ACCENTS.amber} />
                  ))}
                  {groups.vicePresident.map((m) => (
                    <MemberCard key={m.id} onSelect={select} member={m} size="large" title={POSITION_LABELS.vice_president} accent={ACCENTS.purple} />
                  ))}
                </div>
              )}

              {groups.chiefs.length > 0 && (
                <div className="space-y-4">
                  <SubHeading icon={Crown}>Chiefs</SubHeading>
                  <div className="mx-auto flex max-w-[38rem] flex-wrap justify-center gap-5">
                    {groups.chiefs.map((m) => (
                      <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`Chief, ${domainLabel(m.domain)}`} className="w-full sm:w-72" accent={DOMAIN_ACCENT[m.domain]} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ---------- Domains ---------- */}
            {groups.domains.map(({ domain, leads, coLeads, members: regular, total }) => (
              <section key={domain.id} id={domain.slug} className="scroll-mt-32 space-y-6" style={accentVars(DOMAIN_ACCENT[domain.id])} aria-label={`${domain.label} team`}>
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
                          {leads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.lead}, ${domain.label}`} accent={DOMAIN_ACCENT[domain.id]} />)}
                          {coLeads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.co_lead}, ${domain.label}`} accent={DOMAIN_ACCENT[domain.id]} />)}
                        </div>
                      </div>
                    ) : (
                      <>
                        {leads.length > 0 && (
                          <div className="space-y-3">
                            <SubHeading icon={Shield}>{leads.length > 1 ? "Leads" : "Lead"}</SubHeading>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {leads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.lead}, ${domain.label}`} accent={DOMAIN_ACCENT[domain.id]} />)}
                            </div>
                          </div>
                        )}
                        {coLeads.length > 0 && (
                          <div className="space-y-3">
                            <SubHeading icon={Star}>Co-Leads</SubHeading>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {coLeads.map((m) => <MemberCard key={m.id} onSelect={select} member={m} size="medium" title={`${POSITION_LABELS.co_lead}, ${domain.label}`} accent={DOMAIN_ACCENT[domain.id]} />)}
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
