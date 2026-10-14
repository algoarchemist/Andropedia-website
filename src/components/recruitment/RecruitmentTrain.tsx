"use client";

import { useEffect, useRef, useState } from "react";
import {
  easeInOut,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import { createTrainSound, type TrainSound } from "@/lib/train-sound";
import { useSiteSound } from "@/lib/use-site-sound";
import { useStepGuard } from "@/lib/use-step-guard";
import { ACCENTS, accentVars } from "@/content/accents";
import { PROCESS_STEPS } from "@/content/recruitment";

// Recruitment process as a train ride. The page scrolls, a sticky stage stays put, and the camera
// follows the train: the train stays centred while rails, platforms and skyline slide past.
// Between stops it accelerates, streaks and brakes; at each of the five stops scrolling "parks" the
// train (a plateau in the scroll range) while that step's card lights up and the doors glow.
//
// Wireframe (desktop, one frame of the stage):
//
//     How selection works
//     (1)--------(2)--------(3)--------(4)--------(5)      <- route map, buttons jump to a stop
//
//              +-----------------------------+
//              | (3)  Shortlist by email      |            <- step card, lives on the station
//              |      Shortlisted candidates  |
//              +--------------+--------------+
//                             |                            <- post down to the platform
//     ~ far skyline ~ ~ ~ ~ ~ | ~ ~ ~ mid skyline ~ ~ ~
//   ______________[platform]__|__[platform]______________
//    [coach][coach][coach][ENGINE>>)   <- fixed at stage centre, doors glow when stopped
//   ====o=====o=====o=====o=====o=====o===== rails + ties scroll with the world
//
// Scroll map (progress 0..1): stop 1 | ride | stop 2 | ride | ... | stop 5.
// Everything that "moves" is derived from one number, `world` (0 = stop 1 ... 4 = stop 5).

const STOPS = PROCESS_STEPS.length;
const LAST = STOPS - 1;
/** Share of scroll spent parked at each stop; the rest is split between the rides. */
const DWELL = 0.1;
const RIDE = (1 - STOPS * DWELL) / LAST;

const STEP_ACCENTS = [ACCENTS.blue, ACCENTS.teal, ACCENTS.purple, ACCENTS.pink, ACCENTS.amber];

const SCROLL_INPUTS: number[] = [];
const WORLD_OUTPUTS: number[] = [];
PROCESS_STEPS.forEach((_, i) => {
  const start = i * (DWELL + RIDE);
  SCROLL_INPUTS.push(start, i === LAST ? 1 : start + DWELL);
  WORLD_OUTPUTS.push(i, i);
});

const stopCentre = (i: number) => i * (DWELL + RIDE) + DWELL / 2;
const STOP_CENTRES = PROCESS_STEPS.map((_, i) => stopCentre(i));

// Deterministic skyline so server and client markup match.
function skyline(seed: number, count: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: count }, () => ({ w: 26 + Math.floor(rnd() * 54), h: 26 + Math.floor(rnd() * 74) }));
}
const FAR_BUILDINGS = skyline(7, 130);
const MID_BUILDINGS = skyline(23, 130);

function Skyline({ buildings, tint, dots }: { buildings: { w: number; h: number }[]; tint: string; dots?: boolean }) {
  return (
    <div className="flex h-full items-end" aria-hidden="true">
      {buildings.map((b, i) => (
        <div
          key={i}
          className="shrink-0 border-t"
          style={{
            width: b.w,
            height: `${b.h}%`,
            borderColor: tint,
            backgroundImage: dots
              ? `radial-gradient(circle, rgba(143,240,225,0.55) 1px, transparent 1.6px), linear-gradient(to top, ${tint}, transparent)`
              : `linear-gradient(to top, ${tint}, transparent)`,
            backgroundSize: dots ? "12px 15px, 100% 100%" : "100% 100%",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- train artwork

const WHEEL_X = [70, 120, 230, 280, 395, 445, 555, 605, 720, 770, 860, 910];
const COACH_X = [20, 345];

const ART_W = 960; // the train artwork's viewBox, so overlays below can be placed in percentages of it
const ART_H = 170;
const pctX = (x: number) => `${(x / ART_W) * 100}%`;
const pctY = (y: number) => `${(y / ART_H) * 100}%`;

// The wheels and door glows are not part of the SVG: they are small separate layers on top of it. Rotating SVG
// shapes or fading an SVG blur filter repaints the whole train every frame, while a transform or opacity on an
// HTML layer is handled by the compositor, so the train body is painted once and never again.
function Wheel({ cx, rot }: { cx: number; rot: MotionValue<number> }) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute will-change-transform"
      style={{ left: pctX(cx - 14), top: pctY(147 - 14), width: pctX(28), height: pctY(28), rotate: rot }}
    >
      <svg viewBox="-14 -14 28 28" className="block h-full w-full" fill="none" focusable="false">
        <defs>
          <linearGradient id="tr-rim-w" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8cbfff" />
            <stop offset="1" stopColor="#af52de" />
          </linearGradient>
        </defs>
        <circle r={13} fill="#0a0d1c" stroke="url(#tr-rim-w)" strokeWidth={2} />
        <path d="M-10 0 H10 M0 -10 V10" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.5} />
        <circle r={3} fill="#8cbfff" />
      </svg>
    </motion.div>
  );
}

function DoorGlow({ x, opacity }: { x: number; opacity: MotionValue<number> }) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute rounded-[2px] bg-[#2dd4bf] shadow-[0_0_7px_1px_#2dd4bf] will-change-[opacity]"
      style={{ left: pctX(x), top: pctY(44), width: pctX(6), height: pctY(74), opacity }}
    />
  );
}

function TrainArt({ rot, doorGlow }: { rot: MotionValue<number>; doorGlow: MotionValue<number> }) {
  return (
    <>
    <svg viewBox={`0 0 ${ART_W} ${ART_H}`} className="block h-auto w-full" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tr-body" x1="0" y1="30" x2="0" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#222a4d" />
          <stop offset="1" stopColor="#0b0e1f" />
        </linearGradient>
        <linearGradient id="tr-stripe" x1="20" y1="0" x2="950" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="0.4" stopColor="#3395ff" />
          <stop offset="0.75" stopColor="#af52de" />
          <stop offset="1" stopColor="#ff5fa2" />
        </linearGradient>
        <linearGradient id="tr-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dbe9ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#6fa8ff" stopOpacity="0.55" />
        </linearGradient>
        <filter id="tr-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* couplers */}
      <g fill="#10142a" stroke="#ffffff" strokeOpacity={0.2}>
        <rect x={330} y={104} width={15} height={12} rx={3} />
        <rect x={655} y={104} width={17} height={12} rx={3} />
      </g>

      {/* two coaches */}
      {COACH_X.map((x) => (
        <g key={x}>
          <rect x={x} y={30} width={310} height={100} rx={16} fill="url(#tr-body)" stroke="#ffffff" strokeOpacity={0.2} />
          <path d={`M${x + 14} 31 H${x + 296}`} stroke="#ffffff" strokeOpacity={0.35} />
          {Array.from({ length: 6 }, (_, k) => (
            <rect key={k} x={x + 22 + k * 48} y={50} width={38} height={32} rx={7} fill="url(#tr-glass)" opacity={k % 3 === 1 ? 0.95 : 0.7} />
          ))}
          {/* doors: dark panels that light up while the train is stopped */}
          <rect x={x + 12} y={44} width={6} height={74} rx={2} fill="#05070f" />
          <rect x={x} y={96} width={310} height={5} fill="url(#tr-stripe)" opacity={0.95} />
          <rect x={x + 10} y={118} width={290} height={12} rx={3} fill="#070914" />
        </g>
      ))}

      {/* engine */}
      <path d="M672 42 Q672 30 686 30 H830 C890 30 934 64 946 128 V130 H672 Z" fill="url(#tr-body)" stroke="#ffffff" strokeOpacity={0.22} />
      <path d="M690 31 H828" stroke="#ffffff" strokeOpacity={0.4} />
      <path d="M770 48 H832 C868 48 896 68 906 90 H770 Z" fill="url(#tr-glass)" opacity={0.85} />
      <rect x={692} y={50} width={60} height={32} rx={7} fill="url(#tr-glass)" opacity={0.7} />
      <path d="M672 96 H944" stroke="url(#tr-stripe)" strokeWidth={5} opacity={0.95} />
      <rect x={684} y={118} width={262} height={12} rx={3} fill="#070914" />
      <circle cx={943} cy={106} r={6} fill="#8ff0e1" filter="url(#tr-glow)" />

    </svg>

    {COACH_X.flatMap((x) => [x + 12, x + 292]).map((dx) => (
      <DoorGlow key={dx} x={dx} opacity={doorGlow} />
    ))}
    {WHEEL_X.map((cx) => (
      <Wheel key={cx} cx={cx} rot={rot} />
    ))}
    </>
  );
}

// ---------------------------------------------------------------- world pieces

const STREAK_PERIOD = 330; // px: the repeat length of the dash pattern below

function StreakLine({ world, gap, top, speed, className }: { world: MotionValue<number>; gap: MotionValue<number>; top: string; speed: number; className?: string }) {
  // Slide the whole line by a whole number of patterns, so it loops without a jump and only the GPU transform changes.
  const x = useTransform([world, gap], ([v, g]: number[]) => -((v * speed * g) % STREAK_PERIOD));
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute left-0 h-px will-change-transform ${className ?? ""}`}
      style={{
        top,
        x,
        width: `calc(100% + ${STREAK_PERIOD}px)`,
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(190,225,255,0) 0 70px, rgba(190,225,255,0.95) 70px 190px, rgba(190,225,255,0) 190px 330px)",
      }}
    />
  );
}

function Station({ index, world, title, text }: { index: number; world: MotionValue<number>; title: string; text: string }) {
  // 1 while the train is parked here, fading to 0 about 0.6 of a stop away.
  const near = useTransform(world, (v) => Math.max(0, 1 - Math.abs(v - index) * 1.6));
  const opacity = useTransform(near, [0, 1], [0.14, 1]);
  const scale = useTransform(near, [0, 1], [0.94, 1]);
  const lift = useTransform(near, [0, 1], [16, 0]);
  const edge = useTransform(near, [0, 1], [0.15, 1]);
  const accent = STEP_ACCENTS[index % STEP_ACCENTS.length];

  return (
    <div className="absolute bottom-[20%] top-[126px] flex w-[min(88vw,480px)] -translate-x-1/2 flex-col items-center" style={{ left: `calc(${index} * var(--st-gap))` }}>
      {/* No backdrop blur and no CSS transition here: the card moves every scroll frame, a blur behind it is redone each
          frame, and .glass-card's 0.3s transform transition would make it lag behind the scroll. The tint stands in for the blur. */}
      <motion.div
        style={{ opacity, scale, y: lift, ...accentVars(accent) }}
        className="glass-card w-full bg-[rgba(2,6,16,0.55)] p-6 will-change-[transform,opacity] [backdrop-filter:none] [transition:none] sm:p-7"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="chip-accent !h-10 !w-10 shrink-0 justify-center !px-0 text-[17px] font-bold"
            style={{ boxShadow: "0 0 22px var(--a1-soft)" }}
          >
            {index + 1}
          </span>
          <div>
            <h3 className="text-accent text-[24px] font-medium leading-[1.15] tracking-[-0.8px] sm:text-[30px]">{title}</h3>
            <p className="mt-2 text-[15px] leading-6 text-white/70">{text}</p>
            {index === LAST && (
              <a href="#apply" className="btn-glass mt-4 !py-[7px]" data-cursor-text="Apply">
                Apply now <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* post from the card down to the platform */}
      <motion.div
        aria-hidden="true"
        className="w-px flex-1 will-change-[opacity]"
        style={{ opacity: edge, background: `linear-gradient(to bottom, ${accent.a1}00, ${accent.a1})` }}
      />

      {/* platform slab behind the train; its edge lights up on arrival */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 h-9 w-[min(96vw,860px)] -translate-x-1/2 rounded-t-md border-t will-change-[opacity]"
        style={{
          borderColor: accent.a1,
          opacity: edge,
          background: `linear-gradient(to bottom, ${accent.a1}33, rgba(0,0,0,0.0))`,
          boxShadow: `0 -6px 26px ${accent.a1}55`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- the ride

function TrainRide() {
  const sectionRef = useRef<HTMLElement>(null);
  const firedRef = useRef(false);
  const [active, setActive] = useState(0);

  // One swipe, however hard, carries the train one stop at a time (a fling would otherwise ride through all five).
  useStepGuard(sectionRef, STOP_CENTRES, DWELL / 2);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.35, restDelta: 0.00005 });
  // Distance between two stops in px (the CSS --st-gap), so the moving layers use plain numeric transforms.
  const gap = useMotionValue(0);
  useEffect(() => {
    const measure = () => gap.set(window.innerWidth >= 1024 ? window.innerWidth * 0.72 : window.innerWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [gap]);
  // 0 = parked at stop 1 ... LAST = parked at the final stop; eased between stops so it brakes and accelerates.
  const world = useTransform(smooth, SCROLL_INPUTS, WORLD_OUTPUTS, { ease: easeInOut });
  // 0 when parked, 1 mid-ride.
  const moving = useTransform(world, (v) => Math.pow(Math.sin(Math.PI * v), 2));
  const doorGlow = useTransform(moving, (m) => 1 - m);

  const worldX = useTransform([world, gap], ([v, g]: number[]) => -v * g);
  const farX = useTransform([world, gap], ([v, g]: number[]) => -v * 0.16 * g);
  const midX = useTransform([world, gap], ([v, g]: number[]) => -v * 0.38 * g);
  const wheelRot = useTransform(world, (v) => v * 3600);
  // Zero at every stop, so the train rocks only while it is running.
  const sway = useTransform(world, (v) => Math.sin(v * Math.PI * 16) * 1.1);
  const beamOpacity = useTransform(moving, [0, 1], [0, 0.8]);
  const streakOpacity = useTransform(moving, [0, 0.2, 1], [0, 0.25, 0.7]);
  const routeFill = useTransform(world, [0, LAST], [0, 1]);
  const cueOpacity = useTransform(world, [0, 0.12], [1, 0]);

  // Train sound: rail clicks, hum, door chirps and station chimes follow the ride. Silent until the visitor's first click.
  const { state: audioState, enabled: soundOn, toggle: toggleSound } = useSiteSound();
  const sound = useRef<TrainSound | null>(null);
  useEffect(() => {
    const s = createTrainSound();
    sound.current = s;
    return () => {
      s.dispose();
      sound.current = null;
    };
  }, []);
  const onSoundButton = () => {
    if (!toggleSound()) sound.current?.dispose();
  };

  useMotionValueEvent(world, "change", (v) => {
    if (soundOn.current) sound.current?.ride(v);
    setActive(Math.round(v));
    // Only near the end, and only then measure (reading layout on every frame of the ride would stutter it).
    // Gate on the section's real position, not just `world`: the scroll value can glitch high for a
    // moment while the layout is first measured, which must not set off the celebration.
    if (v > LAST - 0.02 && !firedRef.current) {
      const el = sectionRef.current;
      const real = el ? -el.getBoundingClientRect().top / Math.max(1, el.offsetHeight - window.innerHeight) : 0;
      if (real <= 0.85 || real > 1.02) return;
      firedRef.current = true;
      if (soundOn.current) sound.current?.finale();
      import("canvas-confetti").then(({ default: confetti }) =>
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.72 },
          colors: ["#2dd4bf", "#3395ff", "#af52de", "#ff5fa2"],
          disableForReducedMotion: true,
        }),
      );
    } else if (v < LAST - 0.6) {
      firedRef.current = false;
    }
  });

  const goTo = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + stopCentre(i) * range, behavior: "smooth" });
  };

  return (
    <section id="how-selection-works" ref={sectionRef} aria-label="How selection works" className="relative h-[520svh] -scroll-mt-5">
      <div className="sticky top-[60px] isolate h-[calc(100svh-60px)] min-h-[640px] overflow-hidden [--st-gap:100vw] lg:[--st-gap:72vw]">
        {/* sky */}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_30%,rgba(51,149,255,0.16),transparent_70%)]" />

        {/* far and mid skyline, each sliding at its own fraction of the train's speed */}
        <motion.div aria-hidden="true" className="absolute bottom-[20%] left-[-60vw] h-[34%] opacity-40 will-change-transform" style={{ x: farX, width: "calc(120vw + 4 * var(--st-gap) * 0.2)" }}>
          <Skyline buildings={FAR_BUILDINGS} tint="rgba(51,149,255,0.16)" />
        </motion.div>
        <motion.div aria-hidden="true" className="absolute bottom-[20%] left-[-60vw] h-[26%] opacity-70 will-change-transform" style={{ x: midX, width: "calc(120vw + 4 * var(--st-gap) * 0.45)" }}>
          <Skyline buildings={MID_BUILDINGS} tint="rgba(121,120,222,0.2)" dots />
        </motion.div>

        {/* ground glow under the rails */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-[80%] bg-gradient-to-b from-blue-500/[0.09] to-transparent" />

        {/* the world: rails, platforms, posts and cards. Origin is the stage centre; stops sit at i * gap. */}
        <motion.div className="absolute left-1/2 top-0 z-[1] h-full w-0 will-change-transform" style={{ x: worldX }}>
          <div
            aria-hidden="true"
            className="absolute top-[80%] h-[2px] bg-gradient-to-r from-transparent via-white/60 to-transparent"
            style={{ left: "-65vw", width: `calc(${LAST} * var(--st-gap) + 130vw)` }}
          />
          <div
            aria-hidden="true"
            className="absolute top-[calc(80%+5px)] h-2"
            style={{
              left: "-65vw",
              width: `calc(${LAST} * var(--st-gap) + 130vw)`,
              backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 5px, transparent 5px 30px)",
            }}
          />
          {PROCESS_STEPS.map((s, i) => (
            <Station key={s.title} index={i} world={world} title={s.title} text={s.text} />
          ))}
        </motion.div>

        {/* the train: fixed at the centre of the stage */}
        <div className="absolute bottom-[calc(20%-11px)] left-1/2 z-[2] w-[min(94vw,800px)] -translate-x-1/2">
          <motion.div style={{ y: sway }} className="relative">
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-[97%] top-[34%] h-24 w-[38vw]"
              style={{
                opacity: beamOpacity,
                background: "linear-gradient(90deg, rgba(143,240,225,0.5), transparent)",
                clipPath: "polygon(0 40%, 100% 0, 100% 100%, 0 60%)",
              }}
            />
            <TrainArt rot={wheelRot} doorGlow={doorGlow} />
          </motion.div>
        </div>

        {/* speed streaks in front, only while running */}
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]" style={{ opacity: streakOpacity }}>
          <StreakLine world={world} gap={gap} top="calc(80% - 150px)" speed={2.6} className="opacity-50" />
          <StreakLine world={world} gap={gap} top="calc(80% - 96px)" speed={3.4} />
          <StreakLine world={world} gap={gap} top="calc(80% - 52px)" speed={4.2} className="opacity-70" />
          <StreakLine world={world} gap={gap} top="calc(80% + 26px)" speed={5} className="opacity-60" />
        </motion.div>

        {/* title + route map */}
        <div className="absolute inset-x-0 top-4 z-10 px-5 text-center">
          <h2 className="text-fade-strong text-[26px] font-semibold leading-8 tracking-[-0.8px] sm:text-[32px] sm:leading-9">How selection works</h2>
          <nav aria-label="Jump to a step" className="relative mx-auto mt-4 h-8 w-[min(86vw,520px)]">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" aria-hidden="true">
              <motion.div className="h-px origin-left bg-gradient-to-r from-teal-300 via-blue-400 to-pink-400" style={{ scaleX: routeFill }} />
            </div>
            <ol className="absolute inset-0 flex items-center justify-between">
              {PROCESS_STEPS.map((s, i) => (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to step ${i + 1}: ${s.title}`}
                    aria-current={active === i ? "step" : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold backdrop-blur-[6px] transition-colors ${
                      active === i ? "border-white bg-white/20 text-white" : i < active ? "border-white/50 bg-white/10 text-white/80" : "border-white/20 bg-black/50 text-white/50"
                    }`}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <button
          type="button"
          onClick={onSoundButton}
          aria-pressed={audioState === "on"}
          aria-label={audioState === "on" ? "Mute train sound" : "Turn on train sound"}
          className={`absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full border bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] backdrop-blur-[6px] transition-colors hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 ${audioState === "locked" ? "animate-pulse border-sky-300/60 text-sky-200" : "border-white/15 text-white/60"}`}
        >
          {audioState === "on" ? <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> : <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />}
          {audioState === "locked" ? "Click for sound" : audioState === "on" ? "Sound on" : "Sound off"}
        </button>

        <motion.p style={{ opacity: cueOpacity }} className="pointer-events-none absolute inset-x-0 bottom-5 z-10 text-center text-[13px] font-medium text-white/50" aria-hidden="true">
          Scroll to start the ride
        </motion.p>
      </div>
    </section>
  );
}

// Reduced motion: the same five steps as a plain list, no sticky stage.
function StaticSteps() {
  return (
    <section id="how-selection-works" aria-label="How selection works" className="mx-auto max-w-3xl px-5 py-4">
      <h2 className="text-fade-strong mb-6 text-center text-[28px] font-semibold tracking-[-0.8px]">How selection works</h2>
      <ol className="space-y-4">
        {PROCESS_STEPS.map((s, i) => (
          <li key={s.title} className="glass-card flex gap-4 p-6" style={accentVars(STEP_ACCENTS[i % STEP_ACCENTS.length])}>
            <span aria-hidden="true" className="chip-accent !h-10 !w-10 shrink-0 justify-center !px-0 text-[17px] font-bold">
              {i + 1}
            </span>
            <div>
              <h3 className="text-accent text-[22px] font-medium leading-tight">{s.title}</h3>
              <p className="mt-1.5 text-[15px] leading-6 text-white/70">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RecruitmentTrain() {
  const reduce = useReducedMotion();
  return reduce ? <StaticSteps /> : <TrainRide />;
}
