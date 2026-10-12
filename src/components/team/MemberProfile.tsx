"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, ArrowUpRight, Crown, Shield } from "lucide-react";
import { GithubIcon, InstagramIcon, LinkedinIcon } from "@/components/ui/SocialIcons";
import type { Accent } from "@/content/accents";
import { themeFor, themeVars } from "@/content/team-theme";
import { POSITION_LABELS, type TeamMember } from "@/lib/team";

// Shared by the Our Team page and the home page honeycomb.

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

/**
 * A member's photo as a square crop (face kept near the top). Without a photo, or if it fails to load, their initials show instead.
 * `themed` puts the initials on the card's own colour gradient and needs the .tc-* variables from an ancestor.
 */
export function Avatar({ member, className, eager = false, themed = false }: { member: TeamMember; className: string; eager?: boolean; themed?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!member.avatar || failed) {
    const look = themed ? "tc-initials" : "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-300 font-bold";
    return (
      <div className={`${className} flex items-center justify-center ${look}`} aria-label={member.name}>
        {initials(member.name)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading={eager ? "eager" : "lazy"} decoding="async" src={member.avatar} alt={member.name} onError={() => setFailed(true)} className={`${className} object-cover object-[50%_8%]`} />
  );
}

/** The photo inside its gradient ring. The crop is the same as everywhere else. */
export function AvatarRing({ member, ringClass, textClass, eager }: { member: TeamMember; ringClass: string; textClass: string; eager?: boolean }) {
  return (
    <span className={`tc-ring ${ringClass}`}>
      <Avatar themed eager={eager} member={member} className={`block h-full w-full ${textClass}`} />
    </span>
  );
}

export function Socials({ member, size = "md" }: { member: TeamMember; size?: "sm" | "md" | "lg" }) {
  if (!member.github && !member.linkedin && !member.instagram) return null;
  const linkClass = `tc-sq ${size === "sm" ? "tc-sq-sm" : size === "lg" ? "tc-sq-lg" : ""}`;
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {member.github && (
        <a href={member.github} target="_blank" rel="noreferrer" className={linkClass} aria-label={`${member.name} on GitHub`}>
          <GithubIcon className={icon} />
        </a>
      )}
      {member.linkedin && (
        <a href={member.linkedin} target="_blank" rel="noreferrer" className={linkClass} aria-label={`${member.name} on LinkedIn`}>
          <LinkedinIcon className={icon} />
        </a>
      )}
      {member.instagram && (
        <a href={member.instagram} target="_blank" rel="noreferrer" className={linkClass} aria-label={`${member.name} on Instagram`}>
          <InstagramIcon className={icon} />
        </a>
      )}
    </div>
  );
}

/** Crown for the President, Vice President and Chiefs; a shield for Leads and Co-Leads; nothing for members. */
export function RoleIcon({ member, className = "h-3.5 w-3.5" }: { member: TeamMember; className?: string }) {
  switch (member.position) {
    case "president":
    case "vice_president":
    case "chief":
      return <Crown className={className} aria-hidden="true" />;
    case "lead":
    case "co_lead":
      return <Shield className={className} aria-hidden="true" />;
    default:
      return null;
  }
}

/** The filled role chip, plus a "Core team" chip for the President and Vice President. */
export function RoleChips({ member }: { member: TeamMember }) {
  const position = member.position ?? "member";
  return (
    <>
      <span className="tc-chip tc-chip-fill">{POSITION_LABELS[position]}</span>
      {(position === "president" || position === "vice_president") && <span className="tc-chip">Core team</span>}
    </>
  );
}

export interface Selected { member: TeamMember; title?: string; accent?: Accent }

/** Profile card over a dimmed page, in the member's colour. Closes on Esc, backdrop click or the X. */
export function MemberModal({ selected, domainLabel, onClose }: { selected: Selected; domainLabel: string; onClose: () => void }) {
  const { member, title } = selected;
  const theme = themeFor(member);

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
        className="tc-modal relative flex h-[min(88dvh,480px)] w-[min(92vw,520px)] flex-col sm:h-[min(88dvh,520px)]"
        style={{ ...themeVars(theme), willChange: "transform, opacity" }}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tc-modal-banner">
          <span className="tc-dom" title={domainLabel}>{theme.label}</span>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close profile"
            className="group absolute right-2.5 top-2 z-10 flex h-11 w-11 items-center justify-center text-white sm:right-4 sm:top-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-black/55 transition group-hover:rotate-90 group-hover:bg-white/20 sm:h-9 sm:w-9">
              <X className="h-4 w-4" />
            </span>
          </button>
        </div>

        <div className="relative z-[2] -mt-11 flex shrink-0 gap-3.5 px-5 sm:-mt-[52px] sm:gap-5 sm:px-8">
          <AvatarRing eager member={member} ringClass="tc-ring-resp" textClass="text-3xl" />
          <div className="min-w-0 pt-[52px] sm:pt-[60px]">
            <h2 className="break-words text-[22px] font-semibold uppercase leading-7 text-white sm:text-[26px] sm:leading-8">{member.name}</h2>
            <p className="mt-0.5 inline-flex items-start gap-1.5 text-[13px] font-medium leading-[18px]" style={{ color: "var(--t2)" }}>
              <span className="mt-[2px] shrink-0"><RoleIcon member={member} /></span>
              {title ?? POSITION_LABELS[member.position ?? "member"]}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 sm:mt-2.5">
              <RoleChips member={member} />
            </div>
          </div>
        </div>

        <div className="mx-5 mt-5 min-h-0 flex-1 overflow-y-auto pr-1 sm:mx-8 sm:mt-6">
          <p className="tc-about">About</p>
          <p className="whitespace-pre-line pb-3 text-sm leading-6 text-white/80">{member.bio || "This member has not added a bio yet."}</p>
        </div>

        <div className="relative flex h-[76px] shrink-0 items-center justify-between border-t border-dashed px-5 sm:h-[84px] sm:px-8" style={{ borderColor: "var(--tl)" }}>
          <Socials member={member} size="lg" />
          {member.portfolio && (
            <a href={member.portfolio} target="_blank" rel="noreferrer" className="tc-btn ml-auto">
              Portfolio
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
        <span className="tc-bar" aria-hidden="true" />
      </motion.div>
    </motion.div>
  );
}
