"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dot + ring that sit exactly on the real pointer. Both live in one wrapper that is moved straight from the
 * mousemove event (no easing loop, no transform transition), so they can never trail behind the pointer.
 */
export function CustomCursor() {
  const posRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [cursorText, setCursorText] = useState("");

  useEffect(() => {
    // Only for devices with a fine pointer (mouse/trackpad), not touch.
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return;

    const onMouseMove = (e: MouseEvent) => {
      if (posRef.current) posRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      setIsVisible(true);

      const target = e.target as HTMLElement | null;
      const interactive = target?.closest?.("a, button, [role='button'], input, textarea, select, [data-cursor]");
      setIsHovered(!!interactive);
      setCursorText(interactive?.getAttribute("data-cursor-text") || "");
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);
    const onMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div data-gallery-keep aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] hidden overflow-hidden md:block">
      <div ref={posRef} className={`fixed left-0 top-0 h-0 w-0 transition-opacity duration-150 ${isVisible ? "opacity-100" : "opacity-0"}`} style={{ willChange: "transform", transform: "translate3d(-100px, -100px, 0)" }}>
        {/* Inner dot */}
        <div
          className={`absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color,transform] duration-100 ease-out ${
            isHovered ? "scale-150 bg-[#00d4ff]" : "bg-[#0066ff]"
          } ${isClicking ? "scale-75" : ""}`}
        />

        {/* Outer ring */}
        <div
          className={`absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#0066ff]/50 backdrop-blur-[1px] transition-[width,height,background-color,border-color] duration-200 ease-out ${
            isHovered
              ? "h-14 w-14 border-[#00d4ff]/80 bg-[#0066ff]/15 shadow-[0_0_15px_rgba(0,102,255,0.4)]"
              : "h-8 w-8 bg-transparent"
          } ${isClicking ? "scale-90 bg-[#0066ff]/25" : ""}`}
        >
          {cursorText && (
            <span className="px-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#38bdf8]">{cursorText}</span>
          )}
        </div>
      </div>
    </div>
  );
}
