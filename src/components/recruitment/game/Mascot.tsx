"use client";

import { AnimatePresence, motion } from "framer-motion";

export type Mood = "hi" | "cheer" | "oops";

const BOB: Record<Mood, { y?: number[]; x?: number[]; rotate?: number[] }> = {
  hi: { y: [0, -3, 0] },
  cheer: { y: [0, -10, 0], rotate: [0, -6, 6, 0] },
  oops: { x: [0, -4, 4, -3, 3, 0] },
};

/** Thambi, the club robot. A small blocky inline SVG in the site's blue; three moods. */
export function Mascot({ mood, size = 44 }: { mood: Mood; size?: number }) {
  const face =
    mood === "cheer" ? (
      <>
        <path d="M13 26l4-6 4 6" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M27 26l4-6 4 6" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M16 31h16l-3 6H19z" fill="#fff" />
      </>
    ) : mood === "oops" ? (
      <>
        <path d="M14 19l6 7M20 19l-6 7M28 19l6 7M34 19l-6 7" stroke="#fff" strokeWidth="3" fill="none" />
        <path d="M17 36l3-3 4 3 4-3 3 3" stroke="#fff" strokeWidth="3" fill="none" />
      </>
    ) : (
      <>
        <rect x="14" y="20" width="6" height="6" fill="#fff" />
        <rect x="28" y="20" width="6" height="6" fill="#fff" />
        <path d="M17 33h14" stroke="#fff" strokeWidth="3" />
      </>
    );
  return (
    <motion.svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="shrink-0 overflow-visible"
      key={mood}
      animate={BOB[mood]}
      transition={mood === "hi" ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6, ease: "easeOut" }}
    >
      <rect x="22" y="2" width="4" height="8" fill="#3388ff" />
      <rect x="6" y="10" width="36" height="30" rx="3" fill="#000d33" stroke="#3388ff" strokeWidth="3" />
      <rect x="2" y="20" width="4" height="10" fill="#3388ff" />
      <rect x="42" y="20" width="4" height="10" fill="#3388ff" />
      {face}
    </motion.svg>
  );
}

/** Thambi plus a speech bubble. The bubble is a polite live region, so changes are announced. */
export function AndySays({ mood, message }: { mood: Mood; message: string }) {
  return (
    <div className="flex items-center gap-3 lg:max-w-[620px] lg:gap-3.5">
      <Mascot mood={mood} size={44} />
      <div className={`pb-say ${mood === "oops" ? "oops" : ""}`} role="status">
        <b>Thambi says</b>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
