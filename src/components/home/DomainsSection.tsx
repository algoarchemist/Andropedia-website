import { BlurOrb, TitleLines } from "@/components/design/Backdrop";
import { Reveal } from "@/components/design/Reveal";
import { RevealLines, Stagger, StaggerItem } from "@/components/design/scroll";
import { HOME_DOMAINS } from "@/content/home";
import { DomainCard } from "./DomainCard";
import { DomainsWheel } from "./DomainsWheel";

// "Features" frame from the design: a small line, a big fading title, then the six domains.
export function DomainsSection() {
  return (
    <section id="domains" className="relative isolate overflow-x-clip bg-black px-5 py-16 sm:px-10 sm:py-20">
      <BlurOrb variant="features" size={800} opacity={0.5} position={{ left: "50%", top: "42%" }} />

      <div className="relative mx-auto max-w-[1100px] space-y-14">
        <div className="relative mx-auto max-w-[800px] space-y-3 pt-6 text-center">
          <TitleLines className="-top-2 hidden sm:block" />
          <Reveal>
            <p className="text-fade text-[20px] leading-7 tracking-[-0.96px] sm:text-[24px]">Six specialised domains</p>
          </Reveal>
          <RevealLines className="text-[34px] font-medium leading-[1.1] tracking-[-2px] sm:text-[50px]">
            <span className="text-fade">Find the track that fits</span>
            <span className="text-aurora">how you build</span>
          </RevealLines>
        </div>

        <DomainsWheel className="hidden motion-safe:block" />

        <Stagger as="ul" className="grid gap-6 md:grid-cols-2 lg:grid-cols-6 motion-safe:hidden" stagger={0.09}>
          {HOME_DOMAINS.map((d) => (
            <StaggerItem as="li" key={d.id} className="h-full lg:col-span-2">
              <DomainCard d={d} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
