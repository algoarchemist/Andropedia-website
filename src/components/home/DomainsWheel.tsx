"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, animate, cubicBezier, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { AndropediaMark } from "@/components/design/AndropediaMark";
import { usePinned, useStageProgress } from "@/components/design/scroll";
import { DOMAIN_ACCENT } from "@/content/accents";
import { HOME_DOMAINS } from "@/content/home";
import { useSiteSound } from "@/lib/use-site-sound";
import { useStepGuard } from "@/lib/use-step-guard";
import { createProgressSound, type ProgressSound } from "@/lib/progress-sound";
import { scrollTopForStep, stepForProgress, wheelKeyframes } from "@/lib/scroll-steps";
import { DomainCard } from "./DomainCard";

// How much page the wheel takes while pinned, in screen heights. Lower SCREENS_PER_DOMAIN for a quicker wheel.
const SCREENS_PER_DOMAIN = 0.7;
const COUNT = HOME_DOMAINS.length;
const STAGE_SCREENS = 1 + COUNT * SCREENS_PER_DOMAIN;
const NOTCH = 360 / COUNT;
const KEYFRAMES = wheelKeyframes(COUNT);
// Where each domain rests, as the share of the stage travel that jumpTo scrolls to, and how far from it still counts as resting there.
const STOP_CENTRES = HOME_DOMAINS.map((_, i) => (i + 0.5) / COUNT);
const STOP_TOLERANCE = 0.07;
const EASE = cubicBezier(0.65, 0, 0.35, 1);
const TURN_EASE = cubicBezier(0.16, 1, 0.3, 1); // a click on a node: moves at full speed from the first frame, then settles
const now = () => performance.now(); // (kept out of the component so the clock is only read in event handlers)

// The logo in the middle is the progress bar: it starts unlit, fills with blue as you scroll through the six
// domains (a sweep from the tail of the A up to the circuit nodes), and shines once the scroll is complete.
const LIT_FROM = 0.03; // scroll progress where the blue starts to fill
const LIT_TO = 0.93; // ...and where it is full (inside the last domain's resting stretch)
const SHINE_FROM = 0.9; // the shine fades in from here to the end
const UNLIT = "#2b3050"; // dark grey-blue: the logo before it is lit
const LIT = "#4566f0";
const SHINE = "#6f8bff";
// Fixed soft edge for the lit logo's window (3x the logo): solid up to the middle, then a short fade toward the top right.
const LIT_WINDOW_MASK = "linear-gradient(to top right, #000 50%, transparent 54.7%)";

// The focus arc: 30 degrees of the outer rim centred on 3 o'clock (90 degrees clockwise from the top).
const arcPoint = (deg: number) => `${(50 + 49.4 * Math.sin((deg * Math.PI) / 180)).toFixed(2)} ${(50 - 49.4 * Math.cos((deg * Math.PI) / 180)).toFixed(2)}`;
const FOCUS_ARC = `M${arcPoint(75)} A49.4 49.4 0 0 1 ${arcPoint(105)}`;

/** The short name shown next to a domain's number: the first word of its title, except PR and R&D, which keep their usual abbreviations. */
const shortName = (d: (typeof HOME_DOMAINS)[number]) => (d.apiDomain === "PR" || d.apiDomain === "R&D" ? d.apiDomain : d.title.split(" ")[0]);

/** One domain node on the rim. It sits at `angle` on the wheel and is turned back upright as the wheel turns. */
function Node({ index, ring, active, onJump }: { index: number; ring: MotionValue<number>; active: boolean; onJump: () => void }) {
  const d = HOME_DOMAINS[index];
  const Icon = d.icon;
  const accent = DOMAIN_ACCENT[d.apiDomain];
  const angle = index * NOTCH;
  const upright = useTransform(ring, (v) => -angle - v);

  return (
    <div className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${angle}deg) translateX(calc(var(--wheel) / 2))` }}>
      <motion.div className="absolute -left-5 -top-5 h-10 w-10 will-change-transform lg:-left-8 lg:-top-8 lg:h-16 lg:w-16" style={{ rotate: upright }}>
        <button
          type="button"
          onClick={onJump}
          aria-label={`Show ${d.title}`}
          aria-current={active ? "true" : undefined}
          data-cursor-text={d.title}
          className={`group relative flex h-10 w-10 items-center lg:h-16 lg:w-16 justify-center rounded-full transition-[transform,opacity] duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${active ? "scale-[1.28]" : "scale-90 opacity-70 hover:opacity-100"}`}
          style={{ color: accent.a1 }}
        >
          {/* like the logo's circuit nodes: a solid ring around a dark centre, with a thin halo */}
          <span aria-hidden="true" className="absolute inset-0 rounded-full border border-current opacity-40" />
          <span
            aria-hidden="true"
            className="absolute inset-[5px] rounded-full bg-current lg:inset-[7px] transition-shadow duration-500"
            style={{ boxShadow: active ? `0 0 22px ${accent.a1}, 0 0 44px ${accent.a1}66` : `0 0 14px ${accent.a1}55` }}
          />
          <span aria-hidden="true" className="absolute inset-[12px] rounded-full bg-[#060818] lg:inset-[19px]" />
          <Icon className="relative h-3.5 w-3.5 text-white lg:h-[18px] lg:w-[18px]" aria-hidden="true" />
        </button>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 top-[72px] hidden -translate-x-1/2 whitespace-nowrap lg:block font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-500 ${active ? "text-white" : "text-white/40"}`}
        >
          {String(index + 1).padStart(2, "0")} {shortName(d)}
        </span>
      </motion.div>
    </div>
  );
}

/**
 * Every screen size except reduced motion (the parent shows the plain card grid there). On phones the wheel sits above the card.
 * The Andropedia mark is the hub of a wheel with one node per domain. As you scroll, the wheel swings counter-clockwise
 * a notch at a time, brings the next domain round to the right, and pops its description up as a card.
 */
export function DomainsWheel({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const large = usePinned(); // phones get the same wheel, stacked, with a smaller card
  const progress = useStageProgress(wrapRef);
  const guard = useStepGuard(wrapRef, STOP_CENTRES, STOP_TOLERANCE); // one swipe, however hard, turns the wheel one domain
  const [current, setCurrent] = useState(0);
  // A click on a node carries the page to that domain itself. While it does, the card is already the clicked one (not every domain it passes on the way).
  const jumping = useRef<{ cancel: () => void } | null>(null);
  // After the glide the progress value (a spring) is still catching up with the page and passes through the domains on the way:
  // the card stays on the clicked domain until the progress value has arrived there too.
  const landing = useRef<number | null>(null);
  const drive = useMotionValue(0); // what the wheel turns by (see below)
  useEffect(() => () => jumping.current?.cancel(), []);

  // Progress sound. Browsers keep audio silent until the visitor clicks or presses a key (scrolling alone doesn't
  // count), so the button doubles as the unlock and the mute, and shows "Click for sound" until audio is really running.
  const { state: audioState, enabled: soundOn, toggle } = useSiteSound();
  const sound = useRef<ProgressSound | null>(null);
  const stepRef = useRef(0);
  const doneRef = useRef(false);
  useEffect(() => {
    const s = createProgressSound();
    sound.current = s;
    return () => {
      s.dispose();
      sound.current = null;
    };
  }, []);
  const toggleSound = () => {
    if (toggle()) {
      setTimeout(() => sound.current?.step(stepRef.current), 150); // a short sample so you hear that it works
    } else {
      sound.current?.dispose();
    }
  };

  useMotionValueEvent(progress, "change", (v) => {
    const next = stepForProgress(v, COUNT);
    if (soundOn.current) sound.current?.move(v);
    if (jumping.current) return;
    if (landing.current !== null) {
      if (next !== landing.current) return;
      landing.current = null;
      drive.set(v);
    }
    if (next !== stepRef.current) {
      stepRef.current = next;
      if (soundOn.current) sound.current?.step(next);
    }
    setCurrent((c) => (c === next ? c : next));
  });
  // What the wheel turns by. It follows the (spring-smoothed) scroll progress, except on a click on a node: then it is driven straight
  // to that domain at once, so the wheel starts turning the moment you click instead of waiting for the page to scroll and the spring to catch up.
  useMotionValueEvent(progress, "change", (v) => {
    if (!jumping.current && landing.current === null) drive.set(v);
  });
  const ring = useTransform(drive, KEYFRAMES.input, KEYFRAMES.output, { ease: EASE });
  const dust = useTransform(ring, (v) => v * 0.35); // the dotted rim drifts slower than the nodes, for depth
  const accent = DOMAIN_ACCENT[HOME_DOMAINS[current].apiDomain];

  const lit = useTransform(progress, [LIT_FROM, LIT_TO], [0, 1], { clamp: true });
  // The reveal only moves transforms (compositor work). Rewriting a mask-image on every scroll frame repainted the
  // blurred logo on the main thread each time, which is what made it stutter. A 3x window carries a fixed soft-edged
  // mask and slides up the diagonal while the lit logo inside it slides back by the same amount, so the logo stays
  // put and the edge sweeps across it. Window shifts are -21.7%..16.7% of its own size; the logo's are 3x that.
  const winX = useTransform(lit, [0, 1], ["-21.7%", "16.7%"]);
  const winY = useTransform(lit, [0, 1], ["21.7%", "-16.7%"]);
  const logoX = useTransform(lit, [0, 1], ["65%", "-50%"]);
  const logoY = useTransform(lit, [0, 1], ["-65%", "50%"]);
  const shine = useTransform(progress, [SHINE_FROM, 1], [0, 1], { clamp: true });
  const [complete, setComplete] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    const done = v >= 0.985;
    if (done && !doneRef.current && soundOn.current) sound.current?.complete();
    doneRef.current = done;
    setComplete((c) => (c === done ? c : done));
  });

  /** Which domain the page is scrolled to right now, read straight from the scroll position. */
  const stepAtScroll = () => {
    const el = wrapRef.current;
    if (!el) return 0;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(1, el.offsetHeight - window.innerHeight);
    return stepForProgress((window.scrollY - top) / travel, COUNT);
  };

  /**
   * Clicking a node: its card shows at once, and the page glides to that domain's resting place in one move. The page is moved by
   * this code (not the browser's smooth scroll, which a stray wheel tick can cut short) and the swipe guard stands aside meanwhile,
   * so the click always arrives, from any domain to any other.
   */
  const jumpTo = (index: number) => {
    const el = wrapRef.current;
    if (!el) return;
    jumping.current?.cancel();
    landing.current = index;
    const top = scrollTopForStep(index, COUNT, el.getBoundingClientRect().top + window.scrollY, el.offsetHeight, window.innerHeight);
    const from = window.scrollY;

    setCurrent(index);
    if (stepRef.current !== index) {
      stepRef.current = index;
      if (soundOn.current) sound.current?.step(index);
    }

    const started = now();
    const listened = ["touchstart", "keydown"] as const;
    let controls: { stop: () => void } | null = null;
    let driveAnim: { stop: () => void } | null = null;
    const end = () => {
      if (jumping.current !== job) return;
      jumping.current = null;
      listened.forEach((name) => window.removeEventListener(name, interrupt));
      guard.suspend(false);
      // Never hold the card for long: if the progress value does not arrive (a hidden tab, a busy page), let go and follow the page again.
      window.setTimeout(() => {
        if (jumping.current === null && landing.current === index) {
          landing.current = null;
          drive.set(progress.get());
        }
      }, 700);
    };
    // The visitor taking over (a touch or a key) ends the glide where it is. Wheel ticks are deliberately not counted: the glide
    // lasts about a second, and a trackpad that was scrolled just before the click keeps firing wheel ticks (inertia) for as long.
    const interrupt = () => {
      if (now() - started < 350) return;
      controls?.stop();
      landing.current = null;
      end();
      setCurrent(stepAtScroll());
    };
    const job = {
      cancel: () => {
        controls?.stop();
        driveAnim?.stop();
        end();
      },
    };
    jumping.current = job;
    guard.suspend(true);
    listened.forEach((name) => window.addEventListener(name, interrupt, { passive: true }));
    const seconds = Math.min(0.85, 0.4 + (Math.abs(top - from) / window.innerHeight) * 0.07);
    driveAnim = animate(drive, (index + 0.5) / COUNT, { duration: Math.min(seconds, 0.6), ease: TURN_EASE });
    // A glide that has been replaced (by another click) or ended must not touch the page again, even if its animation reports back late.
    controls = animate(from, top, {
      duration: seconds,
      ease: TURN_EASE,
      onUpdate: (v) => {
        if (jumping.current === job) window.scrollTo({ top: v, behavior: "instant" });
      },
      onComplete: () => {
        if (jumping.current !== job) return;
        window.scrollTo({ top, behavior: "instant" });
        end();
        setCurrent(index);
      },
    });
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`} style={{ height: `${STAGE_SCREENS * 100}svh` }}>
      {/* Phones: the stack starts near the top instead of floating in the middle, and the wheel is as wide as the screen allows (78% of the
            width) but never so tall that the card below runs off the bottom (100svh minus the space the card and its heading need). That
            fills the empty space above the wheel; the card keeps its place directly under it. */}
      <div className="sticky top-0 flex h-svh items-center max-lg:items-start max-lg:pt-[84px] [--wheel:clamp(150px,min(78vw,calc(100svh-498px)),360px)] lg:[--wheel:min(66svh,42vw,540px)]">
        {/* faint dot grid, as in the logo artwork */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_40%_50%,#000,transparent)]"
          style={{ backgroundImage: "radial-gradient(rgba(110,130,255,0.35) 1px, transparent 1.6px)", backgroundSize: "38px 38px" }}
        />

        <div className="relative grid w-full grid-cols-1 items-center gap-y-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-[clamp(56px,7vw,110px)] lg:gap-y-0">
          {/* ---------- the wheel ---------- */}
          <div className="relative mx-auto lg:ml-8 lg:mr-0" style={{ width: "var(--wheel)", height: "var(--wheel)" }}>
            <motion.svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full will-change-transform" style={{ rotate: dust }} fill="none">
              <circle cx="50" cy="50" r="49.4" stroke="rgba(110,130,255,0.35)" strokeWidth="0.25" strokeDasharray="0.3 1.6" strokeLinecap="round" />
              <circle cx="50" cy="50" r="44" stroke="rgba(110,130,255,0.22)" strokeWidth="0.18" />
              <circle cx="50" cy="50" r="38" stroke="rgba(110,130,255,0.14)" strokeWidth="0.18" strokeDasharray="0.6 1.2" />
            </motion.svg>
            <motion.div
              aria-hidden="true"
              className="absolute inset-[6%] rounded-full"
              animate={{ opacity: 1 }}
              style={{ background: `radial-gradient(circle, ${accent.a1}22 0%, transparent 62%)`, transition: "background 0.6s" }}
            />

            {/* a faint arc on the rim behind the active node (it always rests at 3 o'clock): easy to miss, easy to follow */}
            <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" fill="none">
              <path d={FOCUS_ARC} stroke={accent.a1} strokeWidth="2.4" strokeLinecap="round" opacity="0.1" style={{ transition: "stroke 0.6s" }} />
              <path d={FOCUS_ARC} stroke={accent.a1} strokeWidth="0.45" strokeLinecap="round" opacity="0.5" style={{ transition: "stroke 0.6s" }} />
            </svg>

            {/* the hub: the logo as a progress bar. Unlit grey, then blue fills in as you scroll, then it shines. */}
            <div className="absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
              <motion.div
                className="absolute -inset-[18%] rounded-full"
                style={{ opacity: shine, background: "radial-gradient(circle, rgba(111,139,255,0.55) 0%, rgba(69,102,240,0.18) 45%, transparent 70%)" }}
              />
              <AndropediaMark glow={false} className="relative w-full" style={{ color: UNLIT }} />
              <motion.div
                className="absolute -left-full -top-full h-[300%] w-[300%] will-change-transform"
                style={{ x: winX, y: winY, maskImage: LIT_WINDOW_MASK, WebkitMaskImage: LIT_WINDOW_MASK }}
              >
                <motion.div className="absolute left-1/3 top-1/3 h-1/3 w-1/3 will-change-transform" style={{ x: logoX, y: logoY }}>
                  <AndropediaMark glow={false} className="w-full" style={{ color: LIT, filter: "drop-shadow(0 0 10px rgba(69,102,240,0.55))" }} />
                </motion.div>
              </motion.div>
              <motion.div className={`absolute inset-0 will-change-[opacity] ${complete ? "animate-pulse-glow" : ""}`} style={{ opacity: shine }}>
                <AndropediaMark className="w-full" style={{ color: SHINE }} />
              </motion.div>
            </div>

            {/* the rim: one node per domain, turning with the wheel */}
            <motion.div className="absolute inset-0 will-change-transform" style={{ rotate: ring }}>
              {HOME_DOMAINS.map((d, i) => (
                <Node key={d.id} index={i} ring={ring} active={i === current} onJump={() => jumpTo(i)} />
              ))}
            </motion.div>
          </div>

          {/* ---------- the pop-up card ---------- */}
          <div className="relative lg:min-h-[420px]">
            <div className="mb-2 font-mono lg:mb-4 text-[12px] tabular-nums text-white/45" aria-live="polite">
              <span className="text-[26px] font-medium text-white">{String(current + 1).padStart(2, "0")}</span> / {String(COUNT).padStart(2, "0")}
              <span className="ml-3 uppercase tracking-[0.18em]">{shortName(HOME_DOMAINS[current])}</span>
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={audioState === "on"}
                aria-label={audioState === "on" ? "Mute scroll sound" : "Turn on scroll sound"}
                className={`ml-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 align-middle ${audioState === "locked" ? "animate-pulse border-sky-300/60 text-sky-200" : "border-white/15 text-white/60"} text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
              >
                {audioState === "on" ? <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> : <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />}
                {audioState === "locked" ? "Click for sound" : audioState === "on" ? "Sound on" : "Sound off"}
              </button>
            </div>
            {/* Exactly one card, always the current domain's. (An exit animation queued behind the entrances used to leave the
                previous domain's card up, or stuck, when the step changed quickly.) The old card goes at once; the new one pops in. */}
            <div className="relative">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={HOME_DOMAINS[current].id}
                  initial={{ opacity: 0, scale: 0.95, x: -28 }}
                  animate={{ opacity: 1, scale: 1, x: 0, transition: { type: "spring", stiffness: 260, damping: 28, mass: 0.7 } }}
                  exit={{ opacity: 0, scale: 0.97, x: 18, transition: { duration: 0.18, ease: "easeIn" } }}
                  style={{ transformOrigin: "0% 50%", willChange: "transform, opacity" }}
                >
                  <DomainCard d={HOME_DOMAINS[current]} featured={large} compact={!large} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
