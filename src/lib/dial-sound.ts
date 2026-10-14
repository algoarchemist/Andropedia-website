// Sounds for the rotary-dial menu, synthesised with the Web Audio API (no audio files to load).
// Everything here is a no-op on the server or when the browser has no audio, so callers never need to guard.
//
//   dragStart / dragMove   ratchet clicks while the dial is turned by hand
//   stopThunk              the dial hitting the finger stop
//   startHold / stopHold   a low tense hum while it is held against the stop
//   returnWhirr            the dial spinning back: whirr plus governor ticks
//   ring                   the phone bell, "tring tring"

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let hold: { stop: () => void } | null = null;
let lastTick = 0;

/** Degrees of turn between two ratchet clicks while dragging. */
const TICK_EVERY = 5;

/** localStorage key for the "Sound on / off" button. "off" mutes every sound on the site. */
export const SOUND_KEY = "andropedia-wheel-sound";

/** True if the visitor turned sound off with the button on the domain wheel. */
export function soundMuted(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "off";
  } catch {
    return false;
  }
}

/** The audio context only if it already exists and is allowed to play. Never creates one, so hover sounds stay silent (and warning-free) until the visitor has clicked or pressed a key. */
export function audioReady(): AudioContext | null {
  return ctx && ctx.state === "running" ? ctx : null;
}

/** Fired on `window` whenever the audio context starts or stops, so buttons can show the true state. */
export const SOUND_STATE_EVENT = "andropedia:audio-state";

/**
 * Tries to start audio (a click, key press or tap is what makes the browser allow it) and says whether it is running.
 * Safe to call as often as you like. Also plays a silent blip, which iOS needs to really unlock audio.
 */
export async function unlockAudio(): Promise<boolean> {
  const c = audio();
  if (!c) return false;
  try {
    if (c.state !== "running") await c.resume();
  } catch {
    /* still locked: the next real click or key press tries again */
  }
  if (c.state === "running") {
    try {
      const silent = c.createBufferSource();
      silent.buffer = c.createBuffer(1, 1, 22050);
      silent.connect(c.destination);
      silent.start(0);
    } catch {
      /* not needed on desktop */
    }
  }
  return c.state === "running";
}

/** Fire-and-forget version of unlockAudio for click handlers. */
export function unlockSound() {
  void unlockAudio();
}

/**
 * Starts audio on the visitor's first real click, tap or key press, wherever on the page it happens. It keeps listening
 * until audio is truly running: a Shift key press, or a touch that was only a scroll, doesn't count with browsers and must not
 * use up the chance. Also wakes audio again when the tab comes back to the front.
 */
export function armSoundUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const events = ["pointerdown", "pointerup", "mousedown", "click", "keydown", "touchstart", "touchend"] as const;
  const off = () => {
    events.forEach((name) => window.removeEventListener(name, unlock));
    document.removeEventListener("visibilitychange", wake);
  };
  const unlock = () => {
    if (soundMuted()) return;
    void unlockAudio().then((running) => {
      if (running) off();
    });
  };
  const wake = () => {
    if (document.visibilityState === "visible" && ctx && ctx.state !== "running" && !soundMuted()) void unlockAudio();
  };
  if (!audioReady()) {
    events.forEach((name) => window.addEventListener(name, unlock, { passive: true }));
    document.addEventListener("visibilitychange", wake);
  }
  return off;
}

/** The shared audio context (created on first use, resumed if the browser suspended it), or null without audio support. */
export function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state === "closed") ctx = null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      ctx.addEventListener("statechange", () => window.dispatchEvent(new Event(SOUND_STATE_EVENT)));
    } catch {
      return null;
    }
  }
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  return ctx;
}

export function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** A short filtered noise burst: the "click" of the dial's mechanism. */
function click(c: AudioContext, at: number, { freq = 2400, vol = 0.25, len = 0.014 } = {}) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 1.4;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, Math.random() * 0.5, len + 0.01);
}

/** The dial was grabbed at `turn` degrees. */
export function dragStart(turn: number) {
  lastTick = turn;
}

/** Ratchet clicks as the dial turns, one every few degrees, a little higher in pitch the further it is pulled. */
export function dragMove(turn: number) {
  const c = audio();
  let clicks = 0;
  while (Math.abs(turn - lastTick) >= TICK_EVERY && clicks < 3) {
    lastTick += Math.sign(turn - lastTick) * TICK_EVERY;
    if (c) click(c, c.currentTime + clicks * 0.004, { freq: 1800 + lastTick * 12, vol: 0.2 });
    clicks++;
  }
  if (clicks) haptic(3); // a faint tick under the finger for each ratchet click
}

/**
 * A very short vibration on phones that support it (Chrome on Android; iPhones ignore it). Kept deliberately subtle: a few
 * milliseconds, at most one every 30 ms, and none for visitors who asked for reduced motion.
 */
let lastBuzz = 0;
function haptic(ms: number) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const now = performance.now();
  if (now - lastBuzz < 30) return;
  lastBuzz = now;
  try {
    navigator.vibrate(ms);
  } catch {
    // vibration is a nicety; ignore browsers that refuse it
  }
}

/** The hole reaches the finger stop: a dull knock. */
export function stopThunk() {
  haptic(14); // the dial hits its finger stop: one slightly firmer pulse
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const body = c.createOscillator();
  const gain = c.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(150, t);
  body.frequency.exponentialRampToValueAtTime(48, t + 0.14);
  gain.gain.setValueAtTime(0.55, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  body.connect(gain).connect(c.destination);
  body.start(t);
  body.stop(t + 0.2);
  click(c, t, { freq: 900, vol: 0.4, len: 0.03 });
}

/** A quiet low hum while the dial is held against the stop, like a spring under tension. */
export function startHold() {
  const c = audio();
  if (!c || hold) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = 92;
  osc2.type = "sine";
  osc2.frequency.value = 138;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.07, t + 0.12);
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc2.start(t);
  hold = {
    stop: () => {
      const now = c.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.stop(now + 0.1);
      osc2.stop(now + 0.1);
    },
  };
}

export function stopHold() {
  hold?.stop();
  hold = null;
}

/** The dial spinning back from `fromTurn` degrees over `seconds`: a whirr with the governor's ticks. */
export function returnWhirr(seconds: number, fromTurn: number) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 3;
  // The whirr starts fast and high and slows as the dial settles.
  filter.frequency.setValueAtTime(1500, t);
  filter.frequency.linearRampToValueAtTime(500, t + seconds);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.03);
  gain.gain.setValueAtTime(0.08, t + Math.max(0.03, seconds - 0.06));
  gain.gain.linearRampToValueAtTime(0.0001, t + seconds);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + seconds + 0.02);

  const ticks = Math.max(3, Math.round(fromTurn / 9));
  for (let i = 0; i < ticks; i++) {
    click(c, t + (i / ticks) * seconds, { freq: 3200, vol: 0.12, len: 0.008 });
  }
}

/** The phone bell: two rings, each a fast clapper rattling between two bells. "Tring tring". */
export function ring() {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  const RING = 0.5;
  for (const start of [t0, t0 + RING + 0.18]) {
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, start);
    out.gain.exponentialRampToValueAtTime(0.5, start + 0.01);
    out.gain.setValueAtTime(0.5, start + RING - 0.06);
    out.gain.exponentialRampToValueAtTime(0.0001, start + RING + 0.12);
    out.connect(c.destination);

    // Two bell tones, each struck about 24 times a second by the clapper.
    [
      { freq: 1480, phase: 0 },
      { freq: 1960, phase: 0.5 },
    ].forEach(({ freq, phase }) => {
      const bell = c.createOscillator();
      bell.type = "sine";
      bell.frequency.value = freq;
      const strike = c.createGain();
      strike.gain.value = 0.5;
      const lfo = c.createOscillator();
      lfo.type = "square";
      lfo.frequency.value = 24;
      const depth = c.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(strike.gain);
      bell.connect(strike).connect(out);
      const offset = phase / 24;
      bell.start(start);
      lfo.start(start + offset);
      bell.stop(start + RING + 0.14);
      lfo.stop(start + RING + 0.14);
    });
  }
}
