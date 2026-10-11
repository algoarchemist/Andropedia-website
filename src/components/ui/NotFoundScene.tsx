"use client";

import Image from "next/image";
import { motion } from "framer-motion";

// Small question marks that drift around the mascot's head. Position, size and timing differ
// so they never move in step. They are decoration only; the page text carries the message.
const MARKS = [
  { char: "?", className: "left-[4%] top-[14%] text-4xl sm:text-5xl", delay: 0 },
  { char: "?", className: "right-[2%] top-[4%] text-3xl sm:text-4xl", delay: 0.9 },
  { char: "?", className: "right-[10%] top-[34%] text-2xl sm:text-3xl", delay: 1.7 },
] as const;

/**
 * The status picture: a huge code ("404" by default, "OFF" when offline, "500" for a server error) with the club
 * mascot standing in front of it, looking around. Motion is switched off for visitors who prefer
 * reduced motion (MotionProvider in the root layout).
 */
export function NotFoundScene({ code = "404" }: { code?: string }) {
  return (
    <div className="relative mx-auto flex h-[340px] w-full max-w-[420px] items-end justify-center select-none sm:h-[460px] sm:max-w-[520px]" aria-hidden="true">
      {/* soft blue pool of light behind everything */}
      <div className="absolute inset-x-[8%] top-[10%] h-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(0,102,255,0.28),transparent)]" />

      {/* the number */}
      <p className="absolute inset-x-0 top-[6%] text-center font-mono text-[8.5rem] font-bold leading-none tracking-tight text-fade-strong opacity-80 sm:text-[12.5rem]">
        {code}
      </p>

      {/* drifting question marks */}
      {MARKS.map((m, i) => (
        <motion.span
          key={i}
          className={`absolute z-20 font-mono font-bold text-a2 drop-shadow-[0_0_10px_rgba(0,102,255,0.8)] ${m.className}`}
          animate={{ y: [0, -8, 0], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: m.delay }}
        >
          {m.char}
        </motion.span>
      ))}

      {/* the mascot, tilting a little as if looking for the page */}
      <motion.div
        className="relative z-10 h-[300px] w-[146px] origin-bottom sm:h-[400px] sm:w-[194px]"
        animate={{ rotate: [-1.5, 1.5, -1.5], y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/mascot.png"
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 146px, 194px"
          className="object-contain drop-shadow-[0_0_35px_rgba(0,102,255,0.35)]"
        />
      </motion.div>
    </div>
  );
}
