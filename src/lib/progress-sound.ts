// Sound for the domain wheel's logo progress bar, synthesised with the Web Audio API.
//
//   move       a swoosh and a soft tone that rise in pitch as the logo fills; only audible while you scroll
//   step       a quick whoosh and a chime when the wheel brings round the next domain
//   complete   a bright shimmer when the logo is fully lit
//
// Browsers keep audio silent until the visitor has touched the page (scrolling alone doesn't count), so
// until then every call is a quiet no-op and the sound switches on after the first click, tap or key press.
import { audioReady, noiseBuffer } from "./dial-sound";

const BASE_HZ = 196; // G3: the tone at 0% progress; it climbs two octaves by 100%
const OCTAVES = 2;
const BLIP_EVERY = 0.04; // a tiny tick for every 4% of the logo that fills
const PEAK_GAIN = 0.07;
const IDLE_MS = 140; // the tone fades out this long after the last scroll movement
const MAX_JUMP = 0.2; // a bigger jump in one go is a restored scroll position or an anchor jump, not a scroll

// A major pentatonic run, one note per domain, so the chimes always sound pleasant together.
const STEP_NOTES = [523.25, 587.33, 659.25, 783.99, 880];

const freqFor = (progress: number) => BASE_HZ * 2 ** (OCTAVES * Math.min(1, Math.max(0, progress)));

function tone(c: AudioContext, freq: number, at: number, len: number, vol: number, type: OscillatorType = "sine") {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

/** A whoosh: filtered noise whose pitch sweeps from `from` to `to` Hz. */
function sweep(c: AudioContext, from: number, to: number, at: number, len: number, vol: number) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + len);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + len * 0.35);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, Math.random() * 0.5, len + 0.02);
}

export interface ProgressSound {
  move(progress: number): void;
  step(index: number): void;
  complete(): void;
  dispose(): void;
}

export function createProgressSound(): ProgressSound {
  let voice: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; air: AudioBufferSourceNode; airFilter: BiquadFilterNode; airGain: GainNode } | null = null;
  let last: number | null = null;
  let lastAt = 0;
  let lastBlip = 0;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let speed = 0; // smoothed progress per second

  const ensureVoice = (c: AudioContext) => {
    if (voice) return voice;
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    osc.type = "triangle";
    osc2.type = "sine";
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    gain.gain.value = 0.0001;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(c.destination);
    osc.start();
    osc2.start();
    // the swoosh: looping noise through a band-pass filter that opens up as the logo fills
    const air = c.createBufferSource();
    air.buffer = noiseBuffer(c);
    air.loop = true;
    const airFilter = c.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.Q.value = 0.9;
    airFilter.frequency.value = 600;
    const airGain = c.createGain();
    airGain.gain.value = 0.0001;
    air.connect(airFilter).connect(airGain).connect(c.destination);
    air.start();
    voice = { osc, osc2, gain, air, airFilter, airGain };
    return voice;
  };

  const fadeOut = () => {
    const c = audioReady();
    if (!c || !voice) return;
    voice.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
    voice.airGain.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
  };

  return {
    move(progress) {
      if (typeof document !== "undefined" && document.hidden) return;
      const c = audioReady();
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      const prev = last;
      last = progress;
      const dt = Math.max(0.001, (now - lastAt) / 1000);
      lastAt = now;
      if (!c || c.state !== "running" || prev === null) return;

      const dp = Math.abs(progress - prev);
      if (dp === 0 || dp > MAX_JUMP) return;
      speed = speed * 0.7 + (dp / dt) * 0.3;

      const v = ensureVoice(c);
      const t = c.currentTime;
      const f = freqFor(progress);
      v.osc.frequency.setTargetAtTime(f, t, 0.03);
      v.osc2.frequency.setTargetAtTime(f * 2, t, 0.03);
      // louder the faster you scroll, up to a gentle ceiling
      v.gain.gain.setTargetAtTime(Math.min(PEAK_GAIN, 0.02 + speed * 0.15), t, 0.04);
      v.airFilter.frequency.setTargetAtTime(500 + progress * 2600 + Math.min(1, speed) * 1800, t, 0.05);
      v.airGain.gain.setTargetAtTime(Math.min(0.16, 0.025 + speed * 0.6), t, 0.05);

      if (Math.abs(progress - lastBlip) >= BLIP_EVERY) {
        lastBlip = progress;
        tone(c, f * 4, t, 0.05, 0.05);
      }

      clearTimeout(idle);
      idle = setTimeout(() => {
        speed = 0;
        fadeOut();
      }, IDLE_MS);
    },

    step(index) {
      const c = audioReady();
      if (!c || c.state !== "running") return;
      const t = c.currentTime;
      const f = STEP_NOTES[Math.min(STEP_NOTES.length - 1, Math.max(0, index))];
      sweep(c, 350, 2800, t, 0.4, 0.2);
      tone(c, f, t + 0.12, 0.35, 0.14, "triangle");
      tone(c, f * 2, t + 0.17, 0.3, 0.06);
    },

    complete() {
      const c = audioReady();
      if (!c || c.state !== "running") return;
      const t = c.currentTime + 0.05;
      sweep(c, 300, 5000, t, 0.7, 0.22);
      // a quick rising arpeggio with a long, bright tail
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(c, f, t + i * 0.07, 0.9 - i * 0.05, 0.09, i % 2 ? "sine" : "triangle"));
    },

    dispose() {
      clearTimeout(idle);
      const c = audioReady();
      if (voice && c) {
        voice.gain.gain.cancelScheduledValues(c.currentTime);
        voice.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.02);
        voice.osc.stop(c.currentTime + 0.1);
        voice.osc2.stop(c.currentTime + 0.1);
        voice.airGain.gain.cancelScheduledValues(c.currentTime);
        voice.airGain.gain.setTargetAtTime(0.0001, c.currentTime, 0.02);
        voice.air.stop(c.currentTime + 0.1);
      }
      voice = null;
    },
  };
}
