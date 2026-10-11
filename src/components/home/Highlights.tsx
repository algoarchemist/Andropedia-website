import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlurOrb } from "@/components/design/Backdrop";
import { Reveal } from "@/components/design/Reveal";
import { HighlightCards } from "@/components/home/HighlightCards";
import { ACCENTS } from "@/content/accents";

// "Changelog" frame from the design: a two-tone statement, then flat dark cards.
export function Highlights() {
  return (
    <section id="highlights" className="relative isolate overflow-x-clip bg-black px-5 py-16 sm:px-10 sm:py-20 lg:px-[90px]">
      <BlurOrb variant="log" size={800} opacity={0.4} position={{ left: "50%", top: "60%" }} />

      <div className="relative mx-auto max-w-[1260px] space-y-14">
        <Reveal className="max-w-[720px] space-y-7">
          <p className="text-[24px] font-medium leading-[1.25] tracking-[-1.2px] text-white sm:text-[30px]">
            <span style={{ color: ACCENTS.blue.a2 }}>Cloud,</span>{" "}
            <span style={{ color: ACCENTS.purple.a2 }}>code</span> and{" "}
            <span style={{ color: ACCENTS.teal.a2 }}>collaboration.</span>{" "}
            <span className="text-[#606060]">
              Here is a look at the flagship events and contests the club has run, and where you can join in next.
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/events" className="btn-glass">
              All events <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/projects" className="btn-ghost">
              All projects <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>

        <HighlightCards />
      </div>
    </section>
  );
}
