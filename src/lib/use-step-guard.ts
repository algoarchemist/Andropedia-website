"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { clampToBounds, stepBounds } from "@/lib/step-guard";

/**
 * Makes one swipe move a pinned stage by one step, however hard it is flung. A strong trackpad swipe or a touch fling
 * on a phone would otherwise carry the page through every step at once. While a wheel or touch gesture is running, the
 * scroll position is held between the neighbouring steps of where the gesture began (see stepBounds); a fling that hits
 * a bound is stopped on that step, and the next swipe goes on from there.
 *
 * `stopFractions` are the resting steps as 0..1 of the stage's scroll travel (the wrapper height minus the viewport),
 * and `tolerance` the parked stretch around each as a fraction of the same. Only wheel and touch input is held:
 * links, buttons that scroll the page, the keyboard and the scrollbar are left alone.
 *
 * Returns `suspend(true)`, for code that moves the page itself (a click that jumps several steps): while suspended the guard
 * lets every scroll through, so it cannot hold the page back to the next step. `suspend(false)` hands control back.
 */
export function useStepGuard(ref: RefObject<HTMLElement | null>, stopFractions: number[], tolerance: number) {
  const control = useRef<(on: boolean) => void>(() => {});
  const suspend = useCallback((on: boolean) => control.current(on), []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let bounds = { lo: -Infinity, hi: Infinity };
    let active = false; // a wheel or touch gesture (including its inertia) is running
    let touching = false;
    let suspended = false;
    let idle = 0;
    control.current = (on) => {
      suspended = on;
      if (on) {
        active = false;
        touching = false;
        window.clearTimeout(idle);
      }
    };

    const begin = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(0, el.offsetHeight - window.innerHeight);
      if (travel === 0) return; // not pinned (hidden, e.g. for reduced motion): nothing to hold
      bounds = stepBounds(window.scrollY, stopFractions.map((f) => top + f * travel), tolerance * travel);
      active = true;
    };
    // The gesture is over once nothing has moved or touched for a moment (inertia keeps firing scroll events).
    const rest = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (!touching) active = false;
      }, 160);
    };

    const onWheel = () => {
      if (suspended) return;
      if (!active) begin();
      rest();
    };
    const onTouchStart = () => {
      if (suspended) return;
      touching = true;
      begin(); // a finger down also stops any fling, so it always starts a new gesture
      rest();
    };
    const onTouchEnd = () => {
      touching = false;
      rest();
    };
    const onScroll = () => {
      if (!active) return;
      const y = window.scrollY;
      const held = clampToBounds(y, bounds);
      if (held !== y) window.scrollTo({ top: held, behavior: "instant" });
      rest();
    };
    // Tapping a link or button that scrolls the page is not a swipe: let its scroll run its full length.
    const onClick = () => {
      active = false;
      touching = false;
      window.clearTimeout(idle);
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick, true);
    return () => {
      control.current = () => {};
      window.clearTimeout(idle);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick, true);
    };
    // stopFractions is a module constant at the call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, tolerance]);
  return { suspend };
}
