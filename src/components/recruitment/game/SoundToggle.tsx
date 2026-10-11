"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSiteSound } from "@/lib/use-site-sound";

/** Mutes or unmutes the game sounds. The choice is remembered and shared with the rest of the site. */
export function SoundToggle() {
  const { state, toggle } = useSiteSound();
  const off = state === "off";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!off}
      aria-label={off ? "Turn on sound" : "Mute sound"}
      className="pb-xp gap-1.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
    >
      {off ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
      <span className="hidden sm:inline">{off ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
