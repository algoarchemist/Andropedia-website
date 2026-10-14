"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

const HOLD_MS = 1200;

/**
 * The final submit button: press and hold to confirm, so an application cannot be sent by a stray tap. A bar fills while it is
 * held and the action runs when it is full; letting go early cancels. Works with a mouse, a finger, or Space / Enter held down.
 * While `armed` is false (the pledge is not ticked yet) a plain press calls `onBlocked`, which shows what is missing.
 */
export function HoldToConfirm({
  armed,
  disabled,
  onConfirm,
  onBlocked,
  onStart,
  children,
}: {
  armed: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onBlocked: () => void;
  onStart?: () => void;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(0); // 0..1, drives the fill
  const raf = useRef(0);
  const startedAt = useRef<number | null>(null);
  const done = useRef(false);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    startedAt.current = null;
    setProgress(0);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const begin = () => {
    if (!armed || disabled || startedAt.current !== null) return;
    done.current = false;
    startedAt.current = performance.now();
    onStart?.();
    const tick = (now: number) => {
      if (startedAt.current === null) return;
      const p = Math.min(1, (now - startedAt.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        done.current = true;
        startedAt.current = null;
        onConfirm();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const release = () => {
    if (startedAt.current !== null) stop();
    else if (done.current) setProgress(0);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      if (armed) begin();
      else onBlocked();
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      data-cursor-text={armed ? "Hold" : "Apply"}
      className="pb-btn pb-hold"
      aria-label={armed ? "Hold to submit application" : "Submit application"}
      style={{ position: "relative", overflow: "hidden", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (armed) begin();
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={() => {
        if (!armed && !disabled) onBlocked();
      }}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") release();
      }}
      onBlur={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.28)", transformOrigin: "left", transform: `scaleX(${armed && !disabled ? progress : 0})`, pointerEvents: "none" }}
      />
      <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>{children}</span>
    </button>
  );
}
