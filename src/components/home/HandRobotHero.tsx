"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { AndropediaMark } from "@/components/design/AndropediaMark";

// three.js is about half a megabyte: load it after the page is interactive. The globe is a decorative backdrop, so the hands and
// the headline never wait for it.
const GlobeBackground = dynamic(() => import("@/components/design/GlobeBackground").then((m) => m.GlobeBackground), { ssr: false });

// Landing hero. A photographic human hand (left) and robotic arm (right) reach toward each other and
// touch at the fingertips in front of a glowing gradient ring. The hands are the focus; a small ANDROPEDIA
// headline sits BEHIND them and is hidden while they touch. Scrolling down pulls the hands apart, the headline is revealed between them, and the intro
// copy and buttons fade in. The page then continues into the domain marquee.
//
// Assets (public/hero/): hand-a.webp and robot-a.webp, 1376x768, made from hand.png / robot.png (shot on pure black) by turning
// brightness into transparency and baking in the contrast boost. That replaces a full-screen `mix-blend-mode: screen`, which
// forced the browser to re-blend two huge layers every frame and made the hero scroll at a fraction of 60 fps.
//   hand.png  - forearm enters from the LEFT edge, index finger points right
//   robot.png - forearm enters from the RIGHT edge, index finger points left
//
// Layout (desktop):
//
//   +--------------------------------------------------------------------+
//   |  grid lines + blue orb                                             |
//   |                    .-- gradient ring --.                           |
//   |   HAND ======>  [ Pioneering Technology. ]  <====== ROBOT ARM      |   scroll 0
//   |                 [ Building Creators.     ]                         |
//   |   Andropedia - tagline                       |
//   +--------------------------------------------------------------------+
//                         scroll down (sticky stage)
//   +--------------------------------------------------------------------+
//   |  HAND ==>        Pioneering Technology.           <== ROBOT ARM    |   scroll 1
//   |                  Building Creators.                                |
//   |                    paragraph        [Join now]                     |
//   +--------------------------------------------------------------------+

// Where each index fingertip sits inside its 1376x768 image (fraction of width / height).
// Used to line both tips up on the centre of the stage.
const HAND_TIP = { x: 0.8, y: 0.385 };
const ROBOT_TIP = { x: 0.2, y: 0.35 };

export function HandRobotHero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // 0 at the top of the section, 1 when the sticky stage is about to scroll away.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.35 });
  // Reduced motion: show the final, already-separated state and let the page scroll normally.
  const settled = useMotionValue(1);
  const p = reduce ? settled : smooth;

  // The hands pull apart over the first 60% of the travel, drifting and growing slightly.
  const handX = useTransform(p, [0, 0.6], ["0%", "-46%"]);
  const handY = useTransform(p, [0, 0.6], ["0%", "-4%"]);
  const handScale = useTransform(p, [0, 0.6], [1, 1.06]);
  const robotX = useTransform(p, [0, 0.6], ["0%", "46%"]);
  const robotY = useTransform(p, [0, 0.6], ["0%", "4%"]);
  const robotScale = useTransform(p, [0, 0.6], [1, 1.06]);
  const partOpacity = useTransform(p, [0.3, 0.6], [1, 0.75]);

  // Gradient ring behind the touch point: swells and dims as they part (fits outside globe like main branch)
  const ringScale = useTransform(p, [0, 0.6], [1, 1.35]);
  const ringOpacity = useTransform(p, [0, 0.6], [0.85, 0.3]);
  // Spark exactly at the contact point.
  const sparkScale = useTransform(p, [0, 0.2], [1, 2.4]);
  const sparkOpacity = useTransform(p, [0, 0.18], [1, 0]);

  // Headline: small and centred behind the hands. It is hidden while they touch and is revealed as they part.
  const headScale = useTransform(p, [0.1, 0.6], [0.92, 1]);
  // "none" once sharp: even blur(0px) keeps the headline on its own filter layer for the whole rest of the page.
  const headBlur = useTransform(p, (v) => (v >= 0.5 ? "none" : `blur(${(6 * Math.min(1, (0.5 - v) / 0.4)).toFixed(2)}px)`));
  const headDim = useTransform(p, [0.12, 0.55], [0, 1]);
  // Intro copy + buttons appear once there is room.
  const subOpacity = useTransform(p, [0.35, 0.62], [0, 1]);
  const subY = useTransform(p, [0.35, 0.62], [28, 0]);
  const subPointer = useTransform(p, (v) => (v > 0.5 ? "auto" : "none"));
  // Scroll cue fades first.
  const cueOpacity = useTransform(p, [0, 0.12], [1, 0]);

  return (
    <section ref={sectionRef} aria-label="Andropedia introduction" className={`relative bg-black ${reduce ? "" : "h-[260svh]"}`}>
        <div className={`relative isolate h-svh min-h-[640px] overflow-hidden bg-black [--hr-w:150vw] sm:[--hr-w:84vw] [--hr-h:calc(var(--hr-w)*0.558)] ${reduce ? "" : "sticky top-0"}`}>
          <GlobeBackground />

          {/* Gradient ring outside the globe (fits like in main branch) */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <motion.div style={{ scale: ringScale, opacity: ringOpacity }}>
              <div
                className="h-[min(78vw,560px)] w-[min(78vw,560px)] rounded-full"
                style={{
                  background: "conic-gradient(from 210deg, #00d4ff, #0066ff, #001a66, #0044cc, #00d4ff)",
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 22px), #000 calc(100% - 21px))",
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 22px), #000 calc(100% - 21px))",
                  filter: "blur(9px)",
                }}
              />
            </motion.div>
          </div>

          {/* Headline: behind the hands in technical Space Mono font with stark white to electric blue gradient */}
          <div className="absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 px-5">
            <motion.div style={{ scale: headScale, filter: headBlur, opacity: headDim }} className="flex flex-col items-center gap-2 text-center sm:gap-3">
              {/* Logo above the word ANDROPEDIA */}
              <div className="relative flex items-center justify-center">
                <AndropediaMark
                  className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-[#0066ff] drop-shadow-[0_0_25px_rgba(0,102,255,0.85)] transition-transform duration-300 hover:scale-105"
                  glow
                />
              </div>

              <h1 className="font-mono font-bold uppercase tracking-[0.08em] text-[clamp(36px,8vw,110px)] leading-[0.9] bg-gradient-to-b from-white via-white/95 to-[#0066ff] bg-clip-text text-transparent filter drop-shadow-[0_0_35px_rgba(0,102,255,0.45)] select-none">
                ANDROPEDIA
              </h1>
              <p className="font-mono text-[clamp(12px,1.6vw,20px)] font-bold uppercase tracking-[0.14em] drop-shadow-[0_0_15px_rgba(0,102,255,0.4)] sm:tracking-[0.18em]">
                <span className="text-white">CREATE !</span>{" "}
                <span className="text-[#38bdf8]">COLLABORATE !</span>{" "}
                <span className="text-[#0066ff]">CONQUER !</span>
              </p>
            </motion.div>
          </div>

          {/* The hands. Each image is positioned so its index fingertip lands on the stage centre. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute" style={{ left: `calc(50% - ${HAND_TIP.x} * var(--hr-w))`, top: `calc(50% - ${HAND_TIP.y} * var(--hr-h))`, width: "var(--hr-w)" }}>
              <motion.div className="will-change-transform" style={{ x: handX, y: handY, scale: handScale, opacity: partOpacity, transformOrigin: `${HAND_TIP.x * 100}% ${HAND_TIP.y * 100}%` }}>
                <div className="animate-float">
                  <Image src="/hero/hand-a.webp" alt="" width={1376} height={768} priority sizes="150vw" draggable={false} className="h-auto w-full select-none" />
                </div>
              </motion.div>
            </div>
            <div className="absolute" style={{ left: `calc(50% - ${ROBOT_TIP.x} * var(--hr-w))`, top: `calc(50% - ${ROBOT_TIP.y} * var(--hr-h))`, width: "var(--hr-w)" }}>
              <motion.div className="will-change-transform" style={{ x: robotX, y: robotY, scale: robotScale, opacity: partOpacity, transformOrigin: `${ROBOT_TIP.x * 100}% ${ROBOT_TIP.y * 100}%` }}>
                <div className="animate-float" style={{ animationDelay: "-3s" }}>
                  <Image src="/hero/robot-a.webp" alt="" width={1376} height={768} priority sizes="150vw" draggable={false} className="h-auto w-full select-none" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Contact spark at the fingertips. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <motion.div style={{ scale: sparkScale, opacity: sparkOpacity }}>
              <div
                className="animate-pulse-glow h-[110px] w-[110px] rounded-full mix-blend-screen"
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(0,212,255,0.7) 22%, rgba(0,102,255,0.4) 45%, transparent 70%)" }}
              />
            </motion.div>
          </div>

          {/* Intro copy, revealed in front once the hands have parted. */}
          <motion.div
            style={{ opacity: subOpacity, y: subY, pointerEvents: subPointer }}
            className="absolute inset-x-0 top-[calc(50%+100px)] z-10 flex flex-col items-center gap-4 px-5 text-center sm:top-[calc(50%+125px)] lg:top-[calc(50%+150px)]"
          >
            <p className="max-w-[620px] font-sans text-[14px] leading-relaxed text-white/85 sm:text-[15px] lg:text-[16px]">
              Andropedia is more than just a technical club at SRMIST. It&apos;s a space where ideas meet people who are willing to bring them to life.
            </p>
          </motion.div>

          {/* Scroll cue. */}
          <motion.div style={{ opacity: cueOpacity }} className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex justify-center sm:bottom-[104px]" aria-hidden="true">
            <span className="animate-float flex items-center gap-1 text-[13px] font-medium text-white/50">
              Scroll
              <ChevronDown className="h-4 w-4" />
            </span>
          </motion.div>


        </div>
      </section>
    );
  }
