import type { Metadata } from "next";
import { ArrowRight, ChevronDown, MessageSquareText, Rocket, Sparkles, Users } from "lucide-react";
import { BlurOrb, GridLines } from "@/components/design/Backdrop";
import { ACCENTS, accentVars } from "@/content/accents";

const WHY_ACCENTS = [ACCENTS.blue, ACCENTS.pink, ACCENTS.teal];
import { JoinForm } from "@/components/recruitment/JoinForm";
import { Eligibility } from "@/components/recruitment/Eligibility";
import { RecruitmentTrain } from "@/components/recruitment/RecruitmentTrain";
import { StatusLookup } from "@/components/recruitment/StatusLookup";
import { FAQS, RECRUITMENT_CYCLE, WHY_JOIN } from "@/content/recruitment";

const description =
  "Apply to join Andropedia, the student technology club. See who can apply, how selection works, and submit your application.";

export const metadata: Metadata = {
  title: { absolute: `Join Andropedia | ${RECRUITMENT_CYCLE}` },
  description,
  alternates: { canonical: "/join" },
  openGraph: {
    title: `Join Andropedia | ${RECRUITMENT_CYCLE}`,
    description,
    url: "/join",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Andropedia: student technology club" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Join Andropedia | ${RECRUITMENT_CYCLE}`,
    description,
    images: ["/opengraph-image"],
  },
};

const WHY_ICONS = [Rocket, MessageSquareText, Users];

// Static overview rendered on the server; only the application form is a client component.
export default function JoinPage() {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-black py-10 sm:py-14 px-4 sm:px-6 lg:px-8 text-white">
      <GridLines variant="hero" />
      <BlurOrb variant="features" size={800} opacity={0.45} position={{ left: "50%", top: "420px" }} />
      <div className="relative max-w-5xl mx-auto space-y-14 sm:space-y-16">
        <header className="text-center max-w-3xl mx-auto space-y-4">
          <div className="chip">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            ANDROPEDIA {RECRUITMENT_CYCLE.toUpperCase()}
          </div>
          <h1 className="text-[40px] sm:text-[60px] font-medium leading-[1.05] tracking-[-2px] sm:tracking-[-3px]">
            <span className="text-fade">Join the</span> <span className="text-aurora">Tech Forge</span>
          </h1>
          <p className="text-white/70 text-base leading-6">
            Take the leap. Build real systems, solve high-stakes problems, and climb the club leaderboard alongside the sharpest minds on campus.
          </p>
          <a
            href="#how-selection-works"
            className="btn-glow"
            data-cursor-text="Apply"
          >
            Start your application <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </header>

        <Eligibility />

        {/* full-bleed train ride, with the reasons to join underneath it */}
        <div className="relative left-1/2 w-screen -translate-x-1/2">
          <RecruitmentTrain />
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5" aria-labelledby="why-heading">
          <h2 id="why-heading" className="sr-only">Why join Andropedia</h2>
          {WHY_JOIN.map((item, i) => {
            const Icon = WHY_ICONS[i % WHY_ICONS.length];
            return (
              <div key={item.title} className="glass-card p-6 space-y-3" style={accentVars(WHY_ACCENTS[i % 3])}>
                <div className="glass-inner w-10 h-10 !rounded-xl flex items-center justify-center" style={{ borderColor: "var(--a1-line)", boxShadow: "0 0 22px var(--a1-soft)" }}>
                  <Icon className="text-a1 w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-accent text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </section>


        <section id="apply" className="scroll-mt-24" aria-label="Application">
          <JoinForm />
        </section>

        <StatusLookup />

        <section className="glass-card p-6 sm:p-12 space-y-6" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-fade text-[30px] font-medium tracking-[-1.2px]">Frequently asked questions</h2>
          <div className="divide-y divide-white/10">
            {FAQS.map((faq, index) => (
              <details key={faq.q} open={index === 0} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md font-semibold text-white hover:text-emerald-400 transition-colors text-base [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-5 h-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180 group-open:text-emerald-400" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
