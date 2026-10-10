"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** How long each photo stays before sliding on; the progress bar fills over exactly this long. */
const INTERVAL_S = 4;

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%" }),
};

/** Auto-sliding carousel that loops forever. Arrows and dots jump ahead, then auto-sliding carries on. */
export function EventGallery({ images, title }: { images: string[]; title: string }) {
  const reduceMotion = useReducedMotion();
  const [[index, dir], setPage] = useState<[number, number]>([0, 1]);
  const count = images.length;
  const auto = !reduceMotion && count > 1;

  const go = useCallback((step: number) => setPage(([i]) => [(i + step + count) % count, step]), [count]);
  const jump = (to: number) => setPage(([i]) => [to, to >= i ? 1 : -1]);

  // Decode the neighbouring photos ahead of time so a slide never has to decode mid-animation.
  useEffect(() => {
    for (const step of [1, -1]) {
      const img = new window.Image();
      img.src = images[(index + step + count) % count];
      img.decode?.().catch(() => {});
    }
  }, [index, images, count]);

  if (count === 0) return null;

  return (
    <div className="space-y-2.5" role="group" aria-roledescription="carousel" aria-label={`${title} photos`}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.65, 0, 0.35, 1] }}
            className="absolute inset-0 transform-gpu will-change-transform"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
          >
            {/* Blurred copy fills the frame so portrait and landscape photos both look intentional. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt={`${title}, photo ${index + 1} of ${count}`} decoding="async" className="relative h-full w-full object-contain" />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/80 backdrop-blur transition hover:bg-black/70 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/80 backdrop-blur transition hover:bg-black/70 hover:text-white">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jump(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === index}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-emerald-400" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Progress bar: a CSS animation that restarts for every photo (re-keyed on change) and moves on to the next one when full. */}
      {auto && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div
            key={index}
            className="gallery-progress h-full w-full rounded-full bg-emerald-400"
            style={{ "--gallery-interval": `${INTERVAL_S}s` } as React.CSSProperties}
            onAnimationEnd={() => go(1)}
          />
        </div>
      )}
    </div>
  );
}
