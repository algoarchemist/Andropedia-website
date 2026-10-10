"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/design/scroll";
import { EventDetailDialog } from "@/components/events/EventDetailDialog";
import { EVENT_LOCATION, HOME_HIGHLIGHTS } from "@/content/home";
import { ACCENTS, accentVars } from "@/content/accents";

const CARD_ACCENTS = [ACCENTS.blue, ACCENTS.purple, ACCENTS.teal];

type Highlight = (typeof HOME_HIGHLIGHTS)[number];

/** The featured event cards. Opening one shows its description and photo carousel. */
export function HighlightCards() {
  const [open, setOpen] = useState<Highlight | null>(null);

  return (
    <>
      <Stagger as="ul" className="grid gap-5 md:grid-cols-3" stagger={0.16}>
        {HOME_HIGHLIGHTS.map((h, i) => {
          const show = () => setOpen(h);
          return (
            <StaggerItem as="li" key={h.id} from={i === 0 ? "left" : i === 2 ? "right" : "up"} tilt={3} className="h-full">
              <article
                role="button"
                tabIndex={0}
                aria-label={`${h.name}: view details and photos`}
                data-cursor-text="View photos"
                onClick={show}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), show())}
                className="dark-card flex h-full cursor-pointer flex-col justify-between gap-8 p-6 transition-colors hover:border-[rgba(0,102,255,0.5)] sm:p-[30px]"
                style={accentVars(CARD_ACCENTS[i % 3])}
              >
                <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 30% at 50% 0%, var(--a1-soft), transparent 75%)" }} />
                <div className="relative space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="chip !px-3 !tracking-[0.06em]">{h.tag}</span>
                    <span className="chip-accent">{h.badge}</span>
                  </div>
                  <h3 className="text-accent text-[20px] font-medium leading-[30px]">{h.title}</h3>
                  <p className="text-[12px] leading-[18px] text-white/50">{h.date}</p>
                  <p className="text-[16px] leading-6 text-white/70">{h.desc}</p>
                </div>
                <span className="text-a2 relative inline-flex items-center gap-1.5 text-[14px] font-medium">
                  {h.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </article>
            </StaggerItem>
          );
        })}
      </Stagger>

      <div className="flex justify-center">
        <Link href="/events" className="btn-glass">
          View all events <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <AnimatePresence>
        {open && (
          <EventDetailDialog
            event={{ id: open.id, title: open.name, type: open.type, description: open.details, location: EVENT_LOCATION }}
            when="Date to be announced"
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
