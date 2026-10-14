// Sounds for the intro.
//
//   type    a keystroke while the address is typed: the NK Cream samples the site uses for every key press
//   back    a Backspace
//   enter   the Enter key
//   bloom   the bar collapsing to a caret and the caret becoming the play triangle: a soft rising sweep
//   pop     the triangle settling: a small bright pop
//   reveal  the triangle opening into the logo: a slow soft swell
//   fly     the logo setting off for the navbar: a sweep that falls away
//   dock    the logo landing in the navbar: a small metallic ping
//
// Browsers keep audio silent until the visitor has clicked or pressed a key, so on a first visit these may be silent. Nothing plays
// while the visitor has sound off, and a sound only starts while the audio context is running, so nothing queued up while it was
// suspended can burst out later.
import { audio, noiseBuffer, soundMuted } from "./dial-sound";

const BASE = "/sounds/nk-cream/";
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

const ready = (): AudioContext | null => {
  if (soundMuted()) return null;
  const c = audio();
  return c && c.state === "running" ? c : null;
};

// ---- the NK Cream samples ---------------------------------------------------------------------------------------------
const buffers = new Map<string, AudioBuffer | Promise<AudioBuffer | null>>();

function load(c: AudioContext, name: string): AudioBuffer | Promise<AudioBuffer | null> {
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
}

/**
 * Warms the browser cache with the samples when the page is idle. It only downloads them (nothing is decoded and no audio context
 * is created), so it cannot hold up the first frames of the intro.
 */
export function preloadKeySamples() {
  const names = ["a", "e", "i", "o", "n", "d", "r", "p", "s", "t", "space", "backspace", "enter"];
  const go = () => names.forEach((n) => void fetch(`${BASE}${n}.wav`).catch(() => {}));
  if (typeof requestIdleCallback === "function") requestIdleCallback(go, { timeout: 1500 });
  else window.setTimeout(go, 600);
}

function sampleName(ch: string): string {
  const k = ch.toLowerCase();
  if (k === " ") return "space";
  if (LETTERS.includes(k)) return k;
  return LETTERS[ch.charCodeAt(0) % LETTERS.length]; // digits and punctuation borrow a letter
}

function playSample(name: string, gain: number, rate: number) {
  const c = ready();
  if (!c) return;
  const go = (b: AudioBuffer | null) => {
    if (!b) return;
    const src = c.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g).connect(c.destination);
    src.start();
  };
  const b = load(c, name);
  if (b instanceof Promise) void b.then(go);
  else go(b);
}

let lastKey = 0;
/** Typing is fast (dozens of characters a second), so keystrokes closer together than this are skipped: it stays a patter, not a buzz. */
const KEY_GAP_MS = 30;
const gap = () => {
  const now = performance.now();
  if (now - lastKey < KEY_GAP_MS) return false;
  lastKey = now;
  return true;
};

export const type = (ch: string) => {
  if (gap()) playSample(sampleName(ch), 0.5, 0.96 + Math.random() * 0.1);
};
export const back = () => {
  if (gap()) playSample("backspace", 0.5, 0.98 + Math.random() * 0.06);
};
export const enter = () => playSample("enter", 0.85, 1);

// ---- synthesised sounds -----------------------------------------------------------------------------------------------
function tone(c: AudioContext, at: number, freq: number, len: number, vol: number, kind: OscillatorType = "sine", toFreq?: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = kind;
  osc.frequency.setValueAtTime(freq, at);
  if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, at + len);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

function noise(c: AudioContext, at: number, from: number, to: number, len: number, vol: number, q = 1) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, at + len);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.02, len / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, Math.random() * 0.5, len + 0.02);
}

export function bloom() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  tone(c, t, 330, 0.5, 0.06, "sine", 880);
  tone(c, t + 0.04, 495, 0.45, 0.035, "triangle", 1320);
}

export function pop() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  tone(c, t, 1320, 0.14, 0.08, "triangle");
  tone(c, t + 0.05, 1980, 0.2, 0.05, "sine");
}

export function reveal() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.01;
  noise(c, t, 300, 1800, 1.3, 0.1, 0.9);
  tone(c, t, 196, 1.4, 0.07, "sine", 392);
  tone(c, t + 0.3, 294, 1.2, 0.04, "triangle", 588);
}

export function fly() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.01;
  noise(c, t, 2200, 380, 1.7, 0.11, 0.9);
  tone(c, t, 480, 1.6, 0.045, "sine", 170);
}

export function dock() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  tone(c, t, 1760, 0.4, 0.07);
  tone(c, t, 2349, 0.32, 0.05);
  tone(c, t + 0.01, 140, 0.12, 0.16, "sine", 60);
}
