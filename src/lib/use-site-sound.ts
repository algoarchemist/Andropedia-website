"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOUND_KEY, SOUND_STATE_EVENT, armSoundUnlock, audioReady, soundMuted, unlockAudio } from "./dial-sound";

export type SiteSoundState = "locked" | "on" | "off";

/**
 * The "Sound on / off" state for a page, and the truth about it: "on" only while audio is really running.
 * Browsers keep audio silent until the visitor clicks, taps or presses a key, so it starts "locked" and flips to "on" as soon
 * as one of those starts audio (unless the visitor muted the site before). Scrolling alone never counts, which is why the
 * button asks for a click. `enabled` is a ref so scroll handlers can check it without re-rendering.
 * The choice is shared by every sound on the site.
 */
export function useSiteSound() {
  const enabled = useRef(false);
  const [state, setState] = useState<SiteSoundState>("locked");

  const sync = useCallback(() => {
    const muted = soundMuted();
    const running = audioReady() !== null;
    enabled.current = !muted && running;
    setState(muted ? "off" : running ? "on" : "locked");
  }, []);

  useEffect(() => {
    queueMicrotask(sync);
    const off = armSoundUnlock();
    window.addEventListener(SOUND_STATE_EVENT, sync);
    return () => {
      off();
      window.removeEventListener(SOUND_STATE_EVENT, sync);
      enabled.current = false;
    };
  }, [sync]);

  /** Click on the sound button: starts audio if it is locked or muted, otherwise mutes. Returns true if sound is now wanted. */
  const toggle = useCallback((): boolean => {
    const turnOn = soundMuted() || audioReady() === null;
    try {
      localStorage.setItem(SOUND_KEY, turnOn ? "on" : "off");
    } catch {}
    if (turnOn) void unlockAudio().then(sync); // the click itself is the gesture the browser wants
    sync();
    return turnOn;
  }, [sync]);

  return { state, enabled, toggle };
}
