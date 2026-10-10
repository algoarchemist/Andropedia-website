"use client";

import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [cursorText, setCursorText] = useState("");

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Check if device has a fine pointer (mouse/trackpad, not touch)
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      // Check hovered element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest("a, button, [role='button'], input, textarea, select, [data-cursor]");
        if (interactive) {
          setIsHovered(true);
          const customText = interactive.getAttribute("data-cursor-text");
          setCursorText(customText || "");
        } else {
          setIsHovered(false);
          setCursorText("");
        }
      }
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    // Smooth lerp loop using requestAnimationFrame
    const loop = () => {
      const lerp = 0.18; // smooth easing factor
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * lerp;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * lerp;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div data-gallery-keep className="hidden md:block pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Inner Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 w-2 h-2 rounded-full transition-transform duration-75 ease-out ${
          isHovered ? "bg-[#00d4ff] scale-150" : "bg-[#0066ff]"
        } ${isClicking ? "scale-75" : ""}`}
        style={{ willChange: "transform" }}
      />

      {/* Outer Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 rounded-full border border-[#0066ff]/50 flex items-center justify-center transition-[width,height,background-color,border-color] duration-200 ease-out backdrop-blur-[1px] ${
          isHovered
            ? "w-14 h-14 bg-[#0066ff]/15 border-[#00d4ff]/80 scale-110 shadow-[0_0_15px_rgba(0,102,255,0.4)]"
            : "w-8 h-8 bg-transparent"
        } ${isClicking ? "scale-90 bg-[#0066ff]/25" : ""}`}
        style={{ willChange: "transform" }}
      >
        {cursorText && (
          <span className="text-[9px] font-mono tracking-wider font-semibold text-[#38bdf8] uppercase px-1">
            {cursorText}
          </span>
        )}
      </div>
    </div>
  );
}
