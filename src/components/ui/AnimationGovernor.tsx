"use client";

import { useEffect } from "react";

// Endless CSS animations (the aurora text, floating hands, pulsing glows, ...) keep the browser painting even when they are far
// off-screen, and several of them (the aurora text animates background-position) repaint on the main thread every frame. Together
// they held the home page at a fraction of 60 fps. This pauses every infinite animation whose element is outside the viewport
// and resumes it when it scrolls back into view. Nothing visible changes: you cannot see what is off-screen.
export function AnimationGovernor() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || typeof document.getAnimations !== "function") return;
    const seen = new WeakSet<Element>();
    const visible = new WeakMap<Element, boolean>();

    const apply = (el: Element, on: boolean) => {
      visible.set(el, on);
      el.getAnimations().forEach((a) => {
        if (a.effect?.getComputedTiming().iterations !== Infinity) return;
        if (on) {
          if (a.playState === "paused") a.play();
        } else if (a.playState === "running") a.pause();
      });
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => apply(e.target, e.isIntersecting)),
      { rootMargin: "120px 0px" },
    );

    const scan = () => {
      document.getAnimations().forEach((a) => {
        const el = (a.effect as KeyframeEffect | null)?.target;
        if (!el || a.effect?.getComputedTiming().iterations !== Infinity) return;
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        } else if (visible.get(el) === false && a.playState === "running") {
          a.pause(); // an animation that restarted while its element is still off-screen
        }
      });
    };

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(scan, 250);
    };
    scan();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
