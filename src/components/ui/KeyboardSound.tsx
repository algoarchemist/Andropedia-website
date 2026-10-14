"use client";

import { useEffect } from "react";
import { audio, soundMuted } from "@/lib/dial-sound";

// NK Cream mechanical keyboard sounds (samples from github.com/Udit-takkar/rusty-mechanical-keyboard), played on every
// key press anywhere on the site. Respects the "Sound" toggle.
const BASE = "/sounds/nk-cream/";
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function sampleFor(e: KeyboardEvent): string {
  switch (e.key) {
    case "Backspace":
    case "Delete":
      return "backspace";
    case "Enter":
      return "enter";
    case " ":
      return "space";
    case "Shift":
      return "shift";
    case "Tab":
      return "tab";
  }
  const k = e.key.toLowerCase();
  if (k.length === 1 && LETTERS.includes(k)) return k;
  // digits, punctuation, arrows and the rest borrow a letter, so they still sound like keys
  return LETTERS[(e.key.charCodeAt(0) || 0) % LETTERS.length];
}

export function KeyboardSound() {
  useEffect(() => {
    const buffers = new Map<string, AudioBuffer | Promise<AudioBuffer | null>>();

    const load = (c: AudioContext, name: string) => {
      const hit = buffers.get(name);
      if (hit) return hit;
      const p = fetch(`${BASE}${name}.wav`)
        .then((r) => r.arrayBuffer())
        .then((data) => c.decodeAudioData(data))
        .then((b) => {
          buffers.set(name, b);
          return b;
        })
        .catch(() => {
          buffers.delete(name);
          return null;
        });
      buffers.set(name, p);
      return p;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat && e.key !== "Backspace" && e.key !== "Delete") return;
      if (soundMuted()) return;
      const c = audio();
      if (!c) return;
      if (c.state === "suspended") void c.resume().catch(() => {});
      const name = sampleFor(e);
      const play = (b: AudioBuffer | null) => {
        if (!b) return;
        const src = c.createBufferSource();
        src.buffer = b;
        src.playbackRate.value = 0.97 + Math.random() * 0.06;
        const gain = c.createGain();
        gain.gain.value = 0.8;
        src.connect(gain).connect(c.destination);
        src.start();
      };
      const b = load(c, name);
      if (b instanceof Promise) void b.then(play);
      else play(b);
      // warm the common keys after the first press so later ones have no delay
      if (buffers.size === 1) ["space", "backspace", "enter", "e", "a", "t", "o", "i", "n", "s"].forEach((n) => void load(c, n));
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return null;
}
