// Sounds for the gamified application form (the pin board), synthesised with the Web Audio API.
// Only moments that matter get a sound. Typing has its own NK Cream keyboard sound (components/ui/KeyboardSound).
//
//   pin / boardClear   a note is pinned (a thock and a coin blip); the last note of a level adds a chime
//   unpin              a note is opened for editing: paper rustle and a soft pop
//   select             an option, year, scale value or starter is picked: a light tick
//   error              something needs a fix: two low, soft buzzes
//   levelUp            the pawn moves on: whoosh, rising notes and a landing thud
//   classLock          a domain class is chosen: metallic clink and sparkle
//   powerFull          an answer reaches its minimum length
//   tile / copy        small clicks for the level tiles, Back and Copy
//   victory            the application is received: fanfare, stamp slam and shimmer
//
// These run inside click handlers, so they start the audio context themselves. They stay silent when the visitor
// switched sound off with the "Sound" button.
import { audio, noiseBuffer, soundMuted } from "./dial-sound";

const ready = (): AudioContext | null => (soundMuted() ? null : audio());

function tone(c: AudioContext, at: number, freq: number, len: number, vol: number, type: OscillatorType = "sine", toFreq?: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
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
  gain.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.01, len / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, Math.random() * 0.5, len + 0.02);
}

/** A soft bell: the note and a quiet overtone. */
const bell = (c: AudioContext, at: number, freq: number, vol: number, len = 0.9) => {
  tone(c, at, freq, len, vol);
  tone(c, at, freq * 2.76, len * 0.4, vol * 0.2);
};

/** A pin pressed into the board: a short thock with a bright tick. */
function thock(c: AudioContext, at: number) {
  tone(c, at, 190, 0.09, 0.3, "sine", 70);
  noise(c, at, 3200, 3200, 0.02, 0.2, 2);
}

export function pin() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  thock(c, t);
  // a coin-like blip: two quick rising notes
  tone(c, t + 0.07, 987.77, 0.1, 0.1, "triangle");
  tone(c, t + 0.14, 1318.51, 0.2, 0.1, "triangle");
}

/** The last required note of a board is pinned. */
export function boardClear() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  thock(c, t);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(c, t + 0.08 + i * 0.07, f, 0.11, 1.0));
}

export function unpin() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  noise(c, t, 2600, 5200, 0.12, 0.09, 0.7);
  tone(c, t + 0.05, 420, 0.08, 0.1, "sine", 260);
}

/** `rise` (0 to 1) lifts the pitch a little, so a scale feels like it climbs. */
export function select(rise = 0) {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  noise(c, t, 2200, 2200, 0.014, 0.12, 1.6);
  tone(c, t, 620 + rise * 520, 0.06, 0.07, "triangle");
}

export function error() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  tone(c, t, 190, 0.12, 0.1, "sawtooth", 150);
  tone(c, t + 0.15, 170, 0.16, 0.1, "sawtooth", 125);
}

export function levelUp() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  noise(c, t, 350, 2800, 0.35, 0.16, 1.1);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, t + 0.1 + i * 0.08, f, 0.4, 0.1, "triangle"));
  tone(c, t + 0.5, 110, 0.14, 0.26, "sine", 55); // the pawn landing
}

export function classLock() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  // a metallic clink, then a thunk, then a little sparkle
  tone(c, t, 1760, 0.35, 0.09);
  tone(c, t, 2349, 0.3, 0.07);
  tone(c, t, 3136, 0.2, 0.04);
  noise(c, t, 4500, 4500, 0.02, 0.16, 2);
  tone(c, t + 0.04, 140, 0.14, 0.25, "sine", 60);
  [1318.51, 1567.98, 2093].forEach((f, i) => tone(c, t + 0.16 + i * 0.07, f, 0.25, 0.06));
}

export function powerFull() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  [659.25, 880, 1318.51].forEach((f, i) => tone(c, t + i * 0.06, f, 0.16, 0.08, "triangle"));
}

/** A level tile or the Back button. */
export function tile() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  noise(c, t, 1800, 1800, 0.016, 0.1, 1.4);
  tone(c, t, 300, 0.05, 0.1, "sine", 200);
}

export function copy() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.005;
  tone(c, t, 1400, 0.04, 0.07, "triangle");
  tone(c, t + 0.06, 1900, 0.06, 0.07, "triangle");
}

/** Application received: a short fanfare, the stamp slamming down, then a shimmer. */
export function victory() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime + 0.05;
  // fanfare: three short notes, then a long rising one
  [523.25, 523.25, 523.25].forEach((f, i) => tone(c, t + i * 0.11, f, 0.14, 0.12, "triangle"));
  tone(c, t + 0.4, 659.25, 0.35, 0.12, "triangle");
  tone(c, t + 0.8, 783.99, 0.9, 0.13, "triangle");
  // a full chord underneath the last note
  [392, 523.25, 659.25].forEach((f) => tone(c, t + 0.8, f, 1.1, 0.06));
  // the stamp
  tone(c, t + 0.55, 120, 0.2, 0.35, "sine", 45);
  noise(c, t + 0.55, 900, 900, 0.08, 0.3, 0.6);
  // the shimmer
  [1046.5, 1318.51, 1567.98, 2093, 2637].forEach((f, i) => bell(c, t + 1.0 + i * 0.07, f, 0.07, 1.2 - i * 0.1));
}
