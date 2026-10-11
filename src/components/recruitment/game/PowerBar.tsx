"use client";

import { useEffect, useRef } from "react";
import { powerFull } from "@/lib/game-sound";

/** Fills as the answer approaches its minimum length. Purely a visual nudge; the server rule is unchanged. */
export function PowerBar({ length, min }: { length: number; min: number }) {
  const ratio = Math.min(length / min, 1);
  const full = length >= min;
  // A little chime the moment the bar fills (not when a saved draft is restored already full).
  const wasFull = useRef(full);
  useEffect(() => {
    if (full && !wasFull.current) powerFull();
    wasFull.current = full;
  }, [full]);
  return (
    <div className="pb-power" role="progressbar" aria-label="Answer power" aria-valuemin={0} aria-valuemax={min} aria-valuenow={Math.min(length, min)}>
      <div className="tr">
        <i style={{ transform: `scaleX(${ratio})` }} />
      </div>
      <span aria-hidden="true">{full ? "Full power" : `${length}/${min}`}</span>
    </div>
  );
}
