"use client";

import { useId, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import type { Accent } from "@/content/accents";
import { dragMove, dragStart, returnWhirr, ring, startHold, stopHold, stopThunk, unlockSound } from "@/lib/dial-sound";
import { DESKTOP_LAYOUT, edgeFade, holeAngle, PHONE_LAYOUT, pointerAngle, polar, pull, reachedStop, requiredRotation, returnSeconds, shortestDelta, visibleAngle } from "@/lib/dial";

export interface DialItem {
  name: string;
  href: string;
  accent: Accent;
}

// The rotary-dial menu. Each page is a ring with its name curved along the inside edge. Press a ring, pull it
// clockwise to the finger stop (letting go anywhere in the catch wedge counts) and the dial spins back and opens
// the page. A quick tap or click on a ring opens it too, and the rings are real buttons for keyboards.
//
// Both sizes show the lower half of a dial hanging from the top edge of the screen (its centre is the top edge):
//   phone    about 380 px wide, 70 px rings
//   desktop  440 px wide, 86 px rings
//
// Each layout is drawn on a fixed grid (the wireframe's pixel sizes) and scaled with --d, the dial's width.

interface Look {
  layout: typeof PHONE_LAYOUT;
  grid: number; // width of the dial on the design grid
  track: number; // distance of each ring's centre from the dial centre
  ring: number; // ring diameter
  rim: number; // width of the rim band
  stopRadius: number; // where the finger stop sits, from the centre
  stopSize: [number, number];
  hub: number; // hub diameter
  /** The name's arc: radius, plus type size and tracking, all in the ring's own units. */
  arc: { r: number; font: number; spacing: number; hole: number };
  title: number; // hub title and hint size, as a share of the dial width
  hint: number;
  /** "--d": how wide the dial is allowed to be. */
  width: string;
  /** The hub is half off screen, so its text sits low in the visible half: space under it, on the grid. */
  hubPad: number;
}

const LOOKS: Record<"phone" | "desktop", Look> = {
  phone: {
    layout: PHONE_LAYOUT,
    grid: 380,
    track: 140,
    ring: 70,
    rim: 12,
    stopRadius: 184,
    stopSize: [44, 18],
    hub: 190,
    arc: { r: 22, font: 9.5, spacing: 1.5, hole: 13 },
    title: 0.034,
    hint: 0.025,
    width: "min(380px, calc(100vw - 8px))",
    hubPad: 14,
  },
  desktop: {
    layout: DESKTOP_LAYOUT,
    grid: 560,
    track: 220,
    ring: 86,
    rim: 16,
    stopRadius: 272,
    stopSize: [52, 20],
    hub: 250,
    arc: { r: 28, font: 11, spacing: 2, hole: 17 },
    title: 0.027,
    hint: 0.018,
    width: "min(440px, calc(100vw - 24px))",
    hubPad: 22,
  },
};

type Phase = "idle" | "drag" | "reached" | "dialing";

/** Sounds, vibration and pointer capture are extras: if one of them fails in some browser, the dial must still turn and open the page. */
const safe = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* ignore */
  }
};

/**
 * Holds one ring. It follows the turn of the dial, but each ring is placed on its own (not by rotating the whole dial) so a
 * ring turned past the left end of the visible half comes back in at the right end, and the names never tip over.
 */
function RingSlot({ turn, base, grid, track, size, children }: { turn: MotionValue<number>; base: number; grid: number; track: number; size: number; children: React.ReactNode }) {
  const angle = useTransform(turn, (t) => visibleAngle(base + t));
  const at = (v: number) => `${(v / grid) * 100}%`;
  const left = useTransform(angle, (a) => at(polar(grid / 2, grid / 2, track, a).x - size / 2));
  const top = useTransform(angle, (a) => at(polar(grid / 2, grid / 2, track, a).y - size / 2));
  const fade = useTransform(angle, edgeFade);
  const scale = useTransform(fade, (f) => 0.8 + 0.2 * f); // a ring also shrinks a little as it leaves and grows as it enters
  return (
    <motion.div className="absolute" style={{ left, top, opacity: fade, scale, width: at(size), height: at(size) }}>
      {children}
    </motion.div>
  );
}

// How a ring bounces: a small pop when you press it, a bigger bounce when it hits the finger stop, and another
// as you let go and the dial spins back. (A ring that is only hovered just swells a little.)
const BOUNCE = {
  rest: { scale: 1, transition: { type: "spring" as const, stiffness: 420, damping: 18 } },
  hover: { scale: 1.05, transition: { type: "spring" as const, stiffness: 420, damping: 18 } },
  pulling: { scale: [1, 1.14, 1.06], transition: { duration: 0.35, times: [0, 0.45, 1] } },
  caught: { scale: [1.06, 1.26, 0.92, 1.1, 1], transition: { duration: 0.6, times: [0, 0.25, 0.5, 0.75, 1] } },
  dialed: { scale: [1, 1.2, 0.9, 1.08, 1], transition: { duration: 0.6, times: [0, 0.25, 0.5, 0.75, 1] } },
};
const STILL = { rest: { scale: 1 }, hover: { scale: 1 }, pulling: { scale: 1 }, caught: { scale: 1 }, dialed: { scale: 1 } };

/** Dark or light text for a fill, whichever reads better. */
function onColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.3 ? "#05071a" : "#ffffff";
}

export function RingDial({
  items,
  variant,
  onSelect,
  onDragChange,
  onPointerEnter,
  onPointerLeave,
}: {
  items: DialItem[];
  variant: "phone" | "desktop";
  onSelect: (item: DialItem) => void;
  onDragChange?: (dragging: boolean) => void;
  onPointerEnter?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
}) {
  const look = LOOKS[variant];
  const { layout, grid, track, ring: ringSize, arc } = look;
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const turn = useMotionValue(0); // how far the dial is turned clockwise, in degrees
  // What is drawn follows the turn through a stiff spring: pointer events come in steps, this makes the rings glide every frame.
  const drawnTurn = useSpring(turn, { stiffness: 900, damping: 60, mass: 0.5 });
  const drag = useRef<{ hole: number; last: number; raw: number; turn: number; required: number; atStop: boolean; x: number; y: number; at: number } | null>(null);
  const locked = useRef(false);
  const [hole, setHole] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const pct = (v: number) => `${(v / grid) * 100}%`;
  const unit = (k: number) => `calc(var(--d) * ${k})`; // a size on the grid, as a fraction of the dial width

  const holeAt = (target: EventTarget | null) => {
    const el = (target as Element | null)?.closest?.("[data-hole]");
    return el ? Number(el.getAttribute("data-hole")) : null;
  };
  const angleOf = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return pointerAngle(e.clientX - (box.left + box.width / 2), e.clientY - (box.top + box.height / 2));
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const k = holeAt(e.target);
    if (k === null || locked.current) return;
    safe(() => e.currentTarget.setPointerCapture(e.pointerId)); // keeps the pull going when the pointer leaves the dial
    const required = requiredRotation(layout, k);
    turn.stop();
    const start = Math.min(turn.get(), required);
    drag.current = { hole: k, last: angleOf(e), raw: start, turn: start, required, atStop: false, x: e.clientX, y: e.clientY, at: e.timeStamp };
    safe(unlockSound);
    safe(() => dragStart(start));
    setHole(k);
    setPhase("drag");
    onDragChange?.(true);
  };

  /** Follows the pointer: turns the dial by however far the pointer has moved round it. */
  const follow = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const a = angleOf(e);
    ({ raw: d.raw, turn: d.turn } = pull(d.raw, shortestDelta(d.last, a), d.required));
    d.last = a;
    turn.set(d.turn);
    const atStop = reachedStop(d.turn, d.required, layout.catchDeg);
    setPhase(atStop ? "reached" : "drag");
    safe(() => dragMove(d.turn));
    if (atStop !== d.atStop) {
      d.atStop = atStop;
      safe(() => {
        if (atStop) {
          stopThunk();
          startHold();
        } else {
          stopHold();
        }
      });
    }
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current) return follow(e);
    const k = holeAt(e.target);
    setHole((current) => (current === k ? current : k));
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const released = e.type === "pointerup";
    // Where the pointer was let go counts too: it is not always reported as a move first (a quick flick to the stop and release).
    if (released) follow(e);
    drag.current = null;
    safe(stopHold);

    if (released && reachedStop(d.turn, d.required, layout.catchDeg)) {
      // Dialled: the dial spins back at the speed of a real one, then the phone rings and the page opens. The menu stays open until then.
      locked.current = true;
      setPhase("dialing");
      const seconds = reduce ? 0.01 : returnSeconds(d.turn);
      let opened = false;
      const open = () => {
        if (opened) return;
        opened = true;
        locked.current = false;
        setPhase("idle");
        setHole(null);
        safe(ring);
        onDragChange?.(false);
        onSelect(items[d.hole]);
      };
      animate(turn, 0, { duration: seconds, ease: "linear", onComplete: open });
      // The page must open however the animation ends (a slow or busy page, a hidden tab, a sound that fails).
      setTimeout(open, seconds * 1000 + 300);
      safe(() => navigator.vibrate?.(14));
      safe(() => returnWhirr(seconds, d.turn));
      return;
    }

    onDragChange?.(false);
    // A quick tap or click on a ring opens its page: the ring bounces first, then the page opens.
    const tapped = released && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && e.timeStamp - d.at < 600;
    animate(turn, 0, reduce || tapped ? { duration: 0.01 } : { type: "spring", stiffness: 240, damping: 20 });
    if (tapped) {
      locked.current = true;
      setPhase("dialing");
      safe(() => navigator.vibrate?.(14));
      safe(ring);
      setTimeout(
        () => {
          locked.current = false;
          setPhase("idle");
          setHole(null);
          onSelect(items[d.hole]);
        },
        reduce ? 0 : 420,
      );
      return;
    }
    setPhase("idle");
    setHole(null);
    // Let go too early: it springs back and nothing happens.
    if (d.turn > 0) safe(() => returnWhirr(0.35, d.turn));
  };

  const shown = hole !== null ? items[hole] : null;
  const caught = phase === "reached" || phase === "dialing";
  const hint = phase === "dialing" ? "Calling..." : phase === "reached" ? "Let go!" : phase === "drag" ? "Keep pulling" : shown ? "Hold and pull" : "Pull a ring to the stop";
  const stop = polar(grid / 2, grid / 2, look.stopRadius, layout.stop);
  const [stopW, stopH] = look.stopSize;
  const arcPath = `M${ringSize / 2 - arc.r} ${ringSize / 2} A${arc.r} ${arc.r} 0 1 1 ${ringSize / 2 + arc.r} ${ringSize / 2} A${arc.r} ${arc.r} 0 1 1 ${ringSize / 2 - arc.r} ${ringSize / 2}`;

  return (
    <div
      role="group"
      data-dial-zone
      aria-label="Rotary dial menu. Pull a ring to the finger stop, or tap it, to open that page."
      className="pointer-events-auto absolute left-1/2 -translate-x-1/2 touch-none select-none rounded-full"
      style={
        {
          "--d": look.width,
          width: "var(--d)",
          height: "var(--d)",
          top: "calc(var(--d) / -2)", // the dial's centre is the top edge of the screen
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
        } as React.CSSProperties
      }
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onPointerEnter={onPointerEnter}
      onPointerLeave={(e) => {
        if (!drag.current) setHole(null);
        onPointerLeave?.(e);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* the plate with its rim band */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 45%, #141a3d, #05071a)",
          boxShadow: `inset 0 0 0 2px rgba(120,140,255,0.45), inset 0 0 0 ${unit(look.rim / grid)} rgba(27,36,87,0.85), 0 10px 28px rgba(0,0,0,0.5)`,
        }}
      />

      {/* the catch wedge, centred on the finger stop: let go with the ring inside it and the stop catches the ring */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full transition-opacity duration-150"
        style={{
          background: `conic-gradient(from ${layout.stop - layout.catchDeg / 2}deg, rgba(94,234,212,0.34) 0deg ${layout.catchDeg}deg, transparent ${layout.catchDeg}deg 360deg)`,
          opacity: caught ? 1 : phase === "drag" ? 0.7 : 0.4,
        }}
      />

      {/* the track the rings run on */}
      <div
        aria-hidden="true"
        className="absolute rounded-full border border-dashed border-white/20"
        style={{ left: pct(grid / 2 - track), top: pct(grid / 2 - track), width: pct(track * 2), height: pct(track * 2) }}
      />

      {/* the rings: they turn with your finger */}
      <div className="absolute inset-0">
        {items.map((item, i) => {
          const active = hole === i;
          const filled = active && caught;
          const pulling = active && phase === "drag";
          const hot = item.accent.name === "red"; // the one red ring: its resting colours are red too, not the dial's blue
          const textColor = filled ? onColor(item.accent.a1) : hot ? "#fecaca" : "#ffffff";
          const arcId = `${uid}-arc-${i}`;
          const bounce = !active ? "rest" : phase === "dialing" ? "dialed" : phase === "reached" ? "caught" : phase === "drag" ? "pulling" : "hover";
          return (
            <RingSlot key={item.name} turn={reduce ? turn : drawnTurn} base={holeAngle(layout, i)} grid={grid} track={track} size={ringSize}>
              <motion.button
                type="button"
                data-hole={i}
                aria-label={item.name}
                variants={reduce ? STILL : BOUNCE}
                initial={false}
                animate={bounce}
                // Pointer presses are handled by the dial; a click with no pointer (detail 0) is the keyboard.
                onClick={(e) => {
                  if (e.detail === 0) onSelect(item);
                }}
                className="absolute inset-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                style={{
                  cursor: phase === "dialing" ? "default" : phase === "idle" ? "grab" : "grabbing",
                  background: filled ? item.accent.a1 : pulling ? `${item.accent.a1}40` : active ? (hot ? "#3a0f19" : "#1a2150") : hot ? "#2a0b12" : "#0b1030",
                  boxShadow: `inset 0 0 0 ${filled ? 2 : pulling ? 3 : active ? 4 : 2}px ${filled ? item.accent.a2 : pulling || active ? item.accent.a1 : hot ? "rgba(248,113,113,0.85)" : "rgba(150,165,255,0.55)"}${active ? `, 0 0 ${filled ? 22 : 12}px ${item.accent.a1}${filled ? "cc" : "66"}` : ""}`,
                }}
              >
                <svg viewBox={`0 0 ${ringSize} ${ringSize}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
                  <defs>
                    <path id={arcId} d={arcPath} />
                  </defs>
                  {/* the name runs along the inner edge, from 9 o'clock round over the top; 25% of the path is 12 o'clock */}
                  <text textAnchor="middle" fontFamily="inherit" fontSize={arc.font} fontWeight="600" letterSpacing={arc.spacing} fill={textColor}>
                    <textPath href={`#${arcId}`} startOffset="25%">
                      {item.name.toUpperCase()}
                    </textPath>
                  </text>
                  {/* the finger hole, with the number you would dial for this page */}
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={arc.hole} fill="none" stroke={filled ? textColor : pulling ? item.accent.a2 : hot ? "rgba(252,165,165,0.7)" : "rgba(160,175,255,0.6)"} strokeDasharray="3 3" />
                  <text x={ringSize / 2} y={ringSize / 2} textAnchor="middle" dominantBaseline="central" fontSize={arc.hole * 1.05} fontWeight="700" fill={textColor} style={{ fontFamily: "var(--font-space-mono, ui-monospace, monospace)" }}>
                    {i + 1}
                  </text>
                </svg>
              </motion.button>
            </RingSlot>
          );
        })}
      </div>

      {/* the finger stop, fixed on the rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full transition-colors duration-150"
        style={{
          left: pct(stop.x),
          top: pct(stop.y),
          width: pct(stopW),
          height: pct(stopH),
          transform: `translate(-50%, -50%) rotate(${layout.stop - 180}deg)`,
          background: caught ? "#5eead4" : "#aab4ff",
          boxShadow: caught ? "0 0 14px rgba(94,234,212,0.95)" : "0 2px 6px rgba(0,0,0,0.5)",
        }}
      />

      {/* the hub: says what the ring under your finger will do */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute flex flex-col items-center justify-end rounded-full border border-white/20 bg-black/75 text-center"
        style={{
          left: pct(grid / 2 - look.hub / 2),
          top: pct(grid / 2 - look.hub / 2),
          width: pct(look.hub),
          height: pct(look.hub),
          gap: unit(4 / grid),
          paddingBottom: pct(look.hubPad),
        }}
      >
        <span className="font-semibold leading-tight text-white" style={{ fontSize: unit(look.title) }}>
          {shown ? shown.name : "Dial a page"}
        </span>
        <span className={`leading-[1.3] ${caught ? "text-teal-300" : "text-white/55"}`} style={{ width: "75%", fontSize: unit(look.hint) }}>
          {hint}
        </span>
      </div>
    </div>
  );
}
