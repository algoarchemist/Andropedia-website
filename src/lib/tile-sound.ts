// Sounds for the hexagon tiles on the home page, synthesised with the Web Audio API.
//
//   tileHover   a tactile tick and a soft thock, like pressing a keycap
//   tileBreak   a crack, then glass shattering
//   cardHover / cardClick   a faint tick on member cards, and a keyboard-switch "thock-click" when one is opened
//
// Both stay silent until the visitor has clicked or pressed a key once (browsers block audio before that),
// and both respect the "Sound off" button on the domain wheel.
import { audio, audioReady, noiseBuffer, soundMuted } from "./dial-sound";

let lastHover = 0;

function burst(c: AudioContext, at: number, { freq, q = 1.2, vol, len, type = "bandpass" }: { freq: number; q?: number; vol: number; len: number; type?: BiquadFilterType }) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, Math.random() * 0.5, len + 0.01);
}

function ping(c: AudioContext, at: number, freq: number, vol: number, len: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

/** A light keycap press when the pointer lands on a tile. */
export function tileHover() {
  const c = audioReady();
  if (!c || soundMuted()) return;
  const now = performance.now();
  if (now - lastHover < 70) return;
  lastHover = now;
  const t = c.currentTime;
  burst(c, t, { freq: 2600, q: 1.6, vol: 0.14, len: 0.012 });
  const body = c.createOscillator();
  const gain = c.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(240, t);
  body.frequency.exponentialRampToValueAtTime(110, t + 0.05);
  gain.gain.setValueAtTime(0.16, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  body.connect(gain).connect(c.destination);
  body.start(t);
  body.stop(t + 0.09);
}

/** The tile cracks (sharp ticks, about 0.2 s), then shatters: a crash of noise, a thud and falling glass. */
export function tileBreak() {
  const c = audioReady();
  if (!c || soundMuted()) return;
  const t = c.currentTime + 0.01;

  // the crack: a few sharp, uneven ticks
  [0, 0.045, 0.085, 0.14, 0.175].forEach((dt, i) => {
    burst(c, t + dt, { freq: 3800 + i * 500, q: 2.4, vol: 0.32, len: 0.012 });
    ping(c, t + dt, 1900 + i * 260, 0.05, 0.03);
  });

  // the break
  const b = t + 0.2;
  burst(c, b, { freq: 1800, q: 0.5, vol: 0.5, len: 0.35, type: "highpass" });
  burst(c, b, { freq: 700, q: 0.8, vol: 0.35, len: 0.12 });
  const thud = c.createOscillator();
  const g = c.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(130, b);
  thud.frequency.exponentialRampToValueAtTime(45, b + 0.16);
  g.gain.setValueAtTime(0.4, b);
  g.gain.exponentialRampToValueAtTime(0.0001, b + 0.2);
  thud.connect(g).connect(c.destination);
  thud.start(b);
  thud.stop(b + 0.22);

  // shards tinkling as they fall
  for (let i = 0; i < 18; i++) {
    const at = b + 0.02 + Math.random() * 0.4;
    ping(c, at, 2400 + Math.random() * 4200, 0.03 + Math.random() * 0.04, 0.04 + Math.random() * 0.08);
  }
}

let lastCardHover = 0;

/** A very soft, low tick when the pointer lands on a member card. Quieter and shorter than the hexagon tiles. */
export function cardHover() {
  const c = audioReady();
  if (!c || soundMuted()) return;
  const now = performance.now();
  if (now - lastCardHover < 90) return;
  lastCardHover = now;
  const t = c.currentTime;
  burst(c, t, { freq: 1900, q: 1.2, vol: 0.06, len: 0.01 });
  ping(c, t, 520, 0.045, 0.035);
}

/** A mechanical keyboard-switch press: a sharp click on top and a deep thock underneath. Runs inside a click, so it starts audio itself. */
export function cardClick() {
  if (soundMuted()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.005;
  burst(c, t, { freq: 4200, q: 2.2, vol: 0.3, len: 0.012 }); // the click
  burst(c, t + 0.004, { freq: 1500, q: 1, vol: 0.2, len: 0.02 });
  const thock = c.createOscillator();
  const gain = c.createGain();
  thock.type = "sine";
  thock.frequency.setValueAtTime(210, t + 0.012);
  thock.frequency.exponentialRampToValueAtTime(75, t + 0.1);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.setValueAtTime(0.42, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  thock.connect(gain).connect(c.destination);
  thock.start(t);
  thock.stop(t + 0.15);
  // the key bottoming out, a beat later
  burst(c, t + 0.075, { freq: 800, q: 0.9, vol: 0.12, len: 0.025 });
}

/** A bright, rising shimmer that plays with the card's glow when it is clicked. Layers on top of cardClick. */
export function cardGlow() {
  if (soundMuted()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  [660, 990, 1320, 1980].forEach((f, i) => ping(c, t + i * 0.055, f, 0.05 - i * 0.007, 0.45 - i * 0.06));
  burst(c, t, { freq: 6500, q: 0.6, vol: 0.05, len: 0.32, type: "highpass" });
}
