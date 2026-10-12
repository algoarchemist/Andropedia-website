import { DOMAIN_ACCENT, accentVars } from "@/content/accents";
import type { HomeDomain } from "@/content/home";

/**
 * One domain as a glass card. Used by the static grid and, larger (`featured`), by the pinned stage.
 * `compact` is the small version for the pinned stage on phones, where the wheel has to fit above it.
 */
export function DomainCard({ d, featured = false, compact = false }: { d: HomeDomain; featured?: boolean; compact?: boolean }) {
  const Icon = d.icon;
  const accent = DOMAIN_ACCENT[d.apiDomain];
  return (
    <article
      className={`glass-card flex h-full flex-col overflow-hidden ${featured ? "gap-7 p-9 lg:p-11" : compact ? "gap-3 p-4" : "gap-5 p-6 sm:p-7"}`}
      style={accentVars(accent)}
      data-cursor-text={d.title}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 85% 38% at 50% 0%, var(--a1-soft), transparent 72%)" }} />
      <div className="relative flex items-start justify-between gap-3">
        <div
          className={`glass-inner flex items-center justify-center !rounded-xl ${featured ? "h-16 w-16" : compact ? "h-9 w-9" : "h-12 w-12"}`}
          style={{ borderColor: "var(--a1-line)", boxShadow: "0 0 24px var(--a1-soft)" }}
        >
          <Icon className={`text-a1 ${featured ? "h-8 w-8" : compact ? "h-5 w-5" : "h-6 w-6"}`} aria-hidden="true" />
        </div>
        <span className="chip-accent">{d.stats}</span>
      </div>

      <div className="relative space-y-0.5">
        <h3 className={`text-accent font-medium ${featured ? "text-[34px] leading-[1.1] tracking-[-1.2px]" : compact ? "text-[17px] leading-6" : "text-[20px] leading-[27px]"}`}>{d.title}</h3>
        <p className={`text-a2 opacity-80 ${featured ? "text-[15px] leading-6" : compact ? "text-[11px] leading-4" : "text-[12px] leading-[18px]"}`}>{d.subtitle}</p>
      </div>

      <p className={`relative text-white/65 ${featured ? "max-w-[560px] text-[18px] leading-7" : compact ? "text-[13px] leading-[18px]" : "text-[16px] leading-6"}`}>{d.description}</p>

      <ul className={`relative border-t ${compact ? "space-y-0.5 pt-2.5" : "space-y-1.5 pt-4"}`} style={{ borderColor: "var(--a1-soft)" }}>
        {d.activities.map((a) => (
          <li key={a} className={`flex items-center gap-2 text-white/70 ${featured ? "text-[15px] leading-6" : compact ? "text-[12px] leading-4" : "text-[13px] leading-5"}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--a1)", boxShadow: "0 0 8px var(--a1)" }} aria-hidden="true" />
            {a}
          </li>
        ))}
      </ul>
    </article>
  );
}
