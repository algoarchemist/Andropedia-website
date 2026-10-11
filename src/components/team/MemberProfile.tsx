"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Briefcase } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/SocialIcons";
import { accentVars, type Accent } from "@/content/accents";
import { POSITION_LABELS, type TeamMember } from "@/lib/team";

// Shared by the Our Team page and the home page honeycomb.

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function Avatar({ member, className, eager = false }: { member: TeamMember; className: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!member.avatar || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-300 font-bold`} aria-label={member.name}>
        {initials(member.name)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading={eager ? "eager" : "lazy"} decoding="async" src={member.avatar} alt={member.name} onError={() => setFailed(true)} className={`${className} object-cover object-[50%_8%]`} />
  );
}

export function Socials({ member }: { member: TeamMember }) {
  if (!member.github && !member.linkedin) return null;
  const linkClass = "p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors";
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {member.github && (
        <a href={member.github} target="_blank" rel="noreferrer" className={linkClass} aria-label={`${member.name} on GitHub`}>
          <GithubIcon className="w-3.5 h-3.5" />
        </a>
      )}
      {member.linkedin && (
        <a href={member.linkedin} target="_blank" rel="noreferrer" className={linkClass} aria-label={`${member.name} on LinkedIn`}>
          <LinkedinIcon className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

export interface Selected { member: TeamMember; title?: string; accent?: Accent }

/** Square profile card over a blurred, dimmed page. Closes on Esc, backdrop click or the X. */
export function MemberModal({ selected, domainLabel, onClose }: { selected: Selected; domainLabel: string; onClose: () => void }) {
  const { member, title, accent } = selected;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Hiding the page scrollbar would widen the page and re-layout every card: pad by its width instead.
    const prev = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const bar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (bar > 0) document.body.style.paddingRight = `${bar}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      document.body.style.paddingRight = prevPad;
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${member.name}'s profile`}
        className="glass-card relative flex aspect-square w-[min(92vw,520px)] flex-col overflow-hidden p-7 sm:p-9"
        style={{ ...(accent ? accentVars(accent) : {}), backdropFilter: "none", WebkitBackdropFilter: "none", backgroundColor: "#040a18", willChange: "transform, opacity" }}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 45% at 50% 0%, var(--a1-soft, rgba(255,255,255,0.1)), transparent 75%)" }} />
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Close profile"
          className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-white/5 p-2 text-white/70 transition hover:rotate-90 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-center gap-5">
          <Avatar eager member={member} className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl border border-white/30 text-3xl shadow-lg" />
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold uppercase leading-tight text-white">{member.name}</h2>
            {title && <p className="text-a2 mt-1 text-sm font-medium">{title}</p>}
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-white/70">
              <Briefcase className="h-3 w-3" /> {domainLabel}
            </p>
          </div>
        </div>

        <div className="relative mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">About</p>
          <p className="whitespace-pre-line text-sm leading-6 text-white/80">{member.bio || "This member has not added a bio yet."}</p>
        </div>

        <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-white/50">{POSITION_LABELS[member.position ?? "member"]}</span>
          <Socials member={member} />
        </div>
      </motion.div>
    </motion.div>
  );
}
