import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BlurOrb, GridLines } from "@/components/design/Backdrop";
import { AndropediaMark } from "@/components/design/AndropediaMark";

// Hero: Pure black & deep electric blue theme
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-black pb-16 pt-[80px] sm:pt-[110px]">
      <GridLines variant="hero" />
      <BlurOrb variant="hero" size={1054} opacity={0.3} position={{ left: "50%", top: "62%" }} />

      <div className="relative z-10 mx-auto flex max-w-[850px] flex-col items-center gap-5 px-5 text-center">
        <Link href="/join" className="btn-glass" data-cursor-text="Join">
          Recruitment 2026 is open
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        {/* Logo above the word ANDROPEDIA */}
        <div className="relative flex items-center justify-center">
          <AndropediaMark
            className="h-16 w-16 sm:h-20 sm:w-20 text-[#0066ff] drop-shadow-[0_0_25px_rgba(0,102,255,0.85)] transition-transform duration-300 hover:scale-105"
            glow
          />
        </div>

        {/* Main "ANDROPEDIA" hero title */}
        <h1 className="font-mono font-bold uppercase tracking-[0.08em] text-[clamp(42px,9vw,110px)] leading-[0.9] bg-gradient-to-b from-white via-white/95 to-[#0066ff] bg-clip-text text-transparent filter drop-shadow-[0_0_35px_rgba(0,102,255,0.45)]">
          ANDROPEDIA
        </h1>

        <p className="font-mono text-[clamp(14px,2vw,24px)] font-bold uppercase tracking-[0.14em] drop-shadow-[0_0_15px_rgba(0,102,255,0.4)] sm:tracking-[0.18em]">
          <span className="text-white">CREATE !</span>{" "}
          <span className="text-[#38bdf8]">COLLABORATE !</span>{" "}
          <span className="text-[#0066ff]">CONQUER !</span>
        </p>

        <p className="max-w-[620px] font-sans text-[15px] leading-relaxed text-white/85 sm:text-[16px]">
          Andropedia is more than just a technical club at SRMIST. It&apos;s a space where ideas meet people who are willing to bring them to life.
        </p>
      </div>
    </section>
  );
}
