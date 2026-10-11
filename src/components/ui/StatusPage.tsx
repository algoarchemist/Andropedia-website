import type { ReactNode } from "react";
import { NotFoundScene } from "@/components/ui/NotFoundScene";

/**
 * The full-page layout shared by the 404, offline and server-error screens: text and buttons on the left,
 * the mascot scene on the right (above the text on a phone).
 */
export function StatusPage({
  code,
  eyebrow,
  title,
  children,
  actions,
  footer,
}: {
  code: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden px-5 py-10 sm:px-8 lg:py-16">
      {/* the same blue glow and faint grid the rest of the site sits on */}
      <div aria-hidden="true" className="radial-glow pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="grid-pattern pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000,transparent)]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-a2">{eyebrow}</p>
          <h1 className="text-aurora mt-4 font-display text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-6xl">{title}</h1>
          <div className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-white/70 lg:mx-0">{children}</div>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">{actions}</div>
          {footer}
        </div>

        <div className="order-1 lg:order-2">
          <NotFoundScene code={code} />
        </div>
      </div>
    </section>
  );
}
