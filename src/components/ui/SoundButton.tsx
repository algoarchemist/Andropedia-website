"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSiteSound } from "@/lib/use-site-sound";

/** Small "Sound on / off" pill. The choice is remembered and shared by every sound on the site. */
export function SoundButton({ className = "" }: { className?: string }) {
  const { state, toggle } = useSiteSound();
  const off = state === "off";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!off}
      aria-label={off ? "Turn on sound" : "Mute sound"}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
    >
      {off ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {off ? "Sound off" : "Sound on"}
    </button>
  );
}
