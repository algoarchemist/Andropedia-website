"use client";

import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import type { Accent } from "@/content/accents";
import { dragMove, dragStart, returnWhirr, ring, startHold, stopHold, stopThunk, unlockSound } from "@/lib/dial-sound";
import { advance, FINGER_STOP, holeAngle, pointerAngle, polar, reachedStop, requiredRotation, returnSeconds, shortestDelta } from "@/lib/dial";

export interface DialItem {
  name: string;
  href: string;
  accent: Accent;
}

const SIZE = 320;
const C = SIZE / 2;
const HOLE_RADIUS = 116; // distance of each finger hole from the centre
const HOLE_R = 19;

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

type Phase = "idle" | "drag" | "reached" | "dialing";

/**
 * The lower half of a rotary phone dial, hanging from the top edge of the screen, used as a menu. Each page is a numbered finger hole. Press and hold a hole, pull it clockwise
 * until it hits the finger stop, then let go: the dial spins back and the page is dialled. Let go early and it
 * just springs back, so nothing happens by accident.
 */
export function RotaryDial({ items, onSelect, onDragChange }: { items: DialItem[]; onSelect: (item: DialItem) => void; onDragChange?: (dragging: boolean) => void }) {
  const reduce = useReducedMotion();
  const turn = useMotionValue(0); // how far the dial is turned clockwise, in degrees
  const drag = useRef<{ hole: number; last: number; turn: number; required: number; atStop: boolean } | null>(null);
  const locked = useRef(false);
  const [hole, setHole] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const holes = items.map((item, i) => ({ item, angle: holeAngle(i, items.length), ...polar(C, C, HOLE_RADIUS, holeAngle(i, items.length)) }));
  const discPath = [circle(C, C, 148), circle(C, C, 60), ...holes.map((h) => circle(h.x, h.y, HOLE_R))].join("");

  const holeAt = (target: EventTarget | null) => {
    const el = (target as Element | null)?.closest?.("[data-hole]");
    return el ? Number(el.getAttribute("data-hole")) : null;
  };
  const angleOf = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    // The dial's centre is the middle of the top edge: only its lower half is on screen.
    return pointerAngle(e.clientX - (box.left + box.width / 2), e.clientY - box.top);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const k = holeAt(e.target);
    if (k === null || locked.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const required = requiredRotation(k, items.length);
    turn.stop();
    drag.current = { hole: k, last: angleOf(e), turn: Math.min(turn.get(), required), required, atStop: false };
    unlockSound();
    dragStart(drag.current.turn);
    setHole(k);
    setPhase("drag");
    onDragChange?.(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) {
      const k = holeAt(e.target);
      setHole((current) => (current === k ? current : k));
      return;
    }
    const a = angleOf(e);
    d.turn = advance(d.turn, shortestDelta(d.last, a), d.required);
    d.last = a;
    turn.set(d.turn);
    const atStop = reachedStop(d.turn, d.required);
    setPhase(atStop ? "reached" : "drag");
    dragMove(d.turn);
    if (atStop !== d.atStop) {
      d.atStop = atStop;
      if (atStop) {
        stopThunk();
        startHold();
      } else {
        stopHold();
      }
    }
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    stopHold();
    onDragChange?.(false);

    if (e.type === "pointerup" && reachedStop(d.turn, d.required)) {
      // Dialled: the dial spins back at the speed of a real one, then the phone rings and the page opens.
      locked.current = true;
      setPhase("dialing");
      navigator.vibrate?.(14);
      const seconds = reduce ? 0.01 : returnSeconds(d.turn);
      returnWhirr(seconds, d.turn);
      animate(turn, 0, {
        duration: seconds,
        ease: "linear",
        onComplete: () => {
          locked.current = false;
          setPhase("idle");
          setHole(null);
          ring();
          onSelect(items[d.hole]);
        },
      });
      return;
    }
    // Let go too early: it springs back and nothing happens.
    if (d.turn > 0) returnWhirr(0.35, d.turn);
    animate(turn, 0, reduce ? { duration: 0.01 } : { type: "spring", stiffness: 240, damping: 20 });
    setPhase("idle");
    setHole(null);
  };

  const shown = hole !== null ? items[hole] : null;
  const label =
    phase === "dialing" ? "Calling..." : phase === "reached" ? "Let go!" : phase === "drag" ? "Keep pulling" : shown ? "Hold and pull" : "Pick a number";

  return (
    <div
      role="group"
      aria-label="Rotary dial menu. The page links below do the same thing."
      className="relative mx-auto touch-none select-none overflow-hidden"
      style={{ width: "min(94vw, 430px)", aspectRatio: "2 / 1", WebkitTouchCallout: "none", WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={() => !drag.current && setHole(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute left-0 top-0 aspect-square w-full -translate-y-1/2">
      {/* the fixed plate with the numbers, seen through the holes */}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="dial-plate" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#141a3d" />
            <stop offset="1" stopColor="#05071a" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r="157" fill="url(#dial-plate)" stroke="rgba(120,140,255,0.4)" strokeWidth="1.5" />
        <circle cx={C} cy={C} r="151" fill="none" stroke="rgba(120,140,255,0.15)" strokeWidth="1" strokeDasharray="1 5" />
        {holes.map((h, i) => (
          <g key={h.item.name}>
            <circle cx={h.x} cy={h.y} r={HOLE_R + 3} fill={h.item.accent.a1} opacity={hole === i || (phase !== "idle" && hole === i) ? 0.38 : 0.14} />
            <text x={h.x} y={h.y} textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="700" fill={h.item.accent.a2} style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}>
              {i + 1}
            </text>
          </g>
        ))}
      </svg>

      {/* the dial itself: turns with your finger */}
      <motion.div className="absolute inset-0" style={{ rotate: turn }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id="dial-disc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1b2457" stopOpacity="0.94" />
              <stop offset="1" stopColor="#0a0f2c" stopOpacity="0.96" />
            </linearGradient>
          </defs>
          <path d={discPath} fillRule="evenodd" fill="url(#dial-disc)" stroke="rgba(130,150,255,0.55)" strokeWidth="1.5" />
          {/* little grip marks between the holes */}
          {holes.map((h) => {
            const p = polar(C, C, 128, h.angle + 21);
            return <circle key={h.item.name} cx={p.x} cy={p.y} r="1.6" fill="rgba(160,175,255,0.35)" />;
          })}
          {holes.map((h, i) => (
            <g key={h.item.name}>
              <circle cx={h.x} cy={h.y} r={HOLE_R} fill="none" stroke={h.item.accent.a1} strokeWidth={hole === i ? 3 : 1.6} opacity={hole === i ? 1 : 0.7} />
              <circle data-hole={i} cx={h.x} cy={h.y} r={HOLE_R + 3} fill="transparent" style={{ cursor: phase === "dialing" ? "default" : phase === "idle" ? "grab" : "grabbing" }} />
            </g>
          ))}
        </svg>
      </motion.div>

      {/* the finger stop, fixed above the dial */}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
        <g transform={`rotate(${FINGER_STOP} ${C} ${C})`} style={{ filter: phase === "reached" ? "drop-shadow(0 0 8px rgba(94,234,212,0.95))" : "none" }}>
          <rect x={C - 7} y="1" width="14" height="30" rx="5" fill={phase === "reached" ? "#5eead4" : "#aab4ff"} />
          <rect x={C - 2} y="6" width="4" height="20" rx="2" fill="#0a0f2c" opacity="0.5" />
        </g>
      </svg>

      </div>

      {/* centre card: says what the hole under your finger will do */}
      <div className="pointer-events-none absolute left-1/2 top-0 flex h-[19%] w-[38%] -translate-x-1/2 flex-col items-center justify-center rounded-b-full border border-t-0 border-white/10 bg-black/60 px-2 pt-1 text-center backdrop-blur-md">
        {shown ? (
          <span className="text-[13px] font-semibold leading-4 text-white">
            <span className="mr-1.5 font-mono font-bold" style={{ color: shown.accent.a1 }}>{(hole ?? 0) + 1}</span>
            {shown.name}
          </span>
        ) : (
          <span className="text-[13px] font-semibold leading-4 text-white">Dial a page</span>
        )}
        <span className={`mt-0.5 text-[10px] uppercase leading-3 tracking-[0.14em] ${phase === "reached" ? "text-teal-300" : "text-white/45"}`}>{label}</span>
      </div>
    </div>
  );
}
