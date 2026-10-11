// Sound for the recruitment-page train, synthesised with the Web Audio API. A modern electric train, not a steam engine.
//
//   ride(world)   rail clicks that follow how far you scroll, over an electric hum that rises with speed
//   depart        door chirps and a pneumatic hiss as the train leaves a stop
//   arrive        brake hiss, a soft thunk and a two-note station chime as it parks
//   finale        a bright rising run at the last stop
//
// `world` is the page's ride position: 0 = parked at stop 1 ... 4 = parked at stop 5, moving in between.
import { audioReady, noiseBuffer } from "./dial-sound";

const JOINT_EVERY = 0.045; // distance (in stops) between two rail joints: one "ka-chunk" per joint
const REST_WITHIN = 0.015; // closer than this to a whole number counts as parked
const IDLE_MS = 160; // the hum fades this long after the last scroll movement
const MAX_JUMP = 0.6; // a bigger jump in one go is a jump to another stop, not a ride
const HUM_PEAK = 0.045;

// One note per stop for the arrival chime (E5 up to C#6), so the ride climbs as you go.
const CHIME = [659.25, 739.99, 830.61, 987.77, 1108.73];

function noiseHiss(c: AudioContext, at: number, from: number, to: number, len: number, vol: number, q = 0.8) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + len);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + len * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(at, Math.random() * 0.5, len + 0.02);
}

function tone(c: AudioContext, at: number, freq: number, len: number, vol: number, type: OscillatorType = "sine") {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + len + 0.02);
}

/** A soft bell: the note plus a quiet octave-and-a-bit overtone, with a long tail. */
function bell(c: AudioContext, at: number, freq: number, vol: number, len = 1) {
  tone(c, at, freq, len, vol);
  tone(c, at, freq * 2.76, len * 0.5, vol * 0.25);
}

/** One rail joint: a sharp "ka" then a heavier "chunk". */
function joint(c: AudioContext, at: number, vol: number) {
  const click = (t: number, freq: number, v: number, len: number) => {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.1;
    const gain = c.createGain();
    gain.gain.setValueAtTime(v, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t, Math.random() * 0.5, len + 0.01);
  };
  click(at, 2300, vol, 0.016);
  click(at + 0.075, 850, vol * 1.3, 0.03);
  const thump = c.createOscillator();
  const g = c.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(110, at + 0.075);
  thump.frequency.exponentialRampToValueAtTime(55, at + 0.14);
  g.gain.setValueAtTime(vol * 1.1, at + 0.075);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  thump.connect(g).connect(c.destination);
  thump.start(at + 0.075);
  thump.stop(at + 0.18);
}

export interface TrainSound {
  ride(world: number): void;
  finale(): void;
  dispose(): void;
}

export function createTrainSound(): TrainSound {
  let hum: { osc: OscillatorNode; osc2: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  let prev: number | null = null;
  let prevAt = 0;
  let travelled = 0;
  let speed = 0; // smoothed stops per second
  let parkedAt: number | null = null;
  let idle: ReturnType<typeof setTimeout> | undefined;

  const ensureHum = (c: AudioContext) => {
    if (hum) return hum;
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc2.type = "sine";
    filter.type = "lowpass";
    filter.frequency.value = 380;
    gain.gain.value = 0.0001;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(c.destination);
    osc.start();
    osc2.start();
    hum = { osc, osc2, filter, gain };
    return hum;
  };

  const fadeHum = () => {
    const c = audioReady();
    if (c && hum) hum.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.12);
  };

  const depart = (c: AudioContext) => {
    const t = c.currentTime + 0.01;
    // doors-closing chirps, then the hiss of the air brakes releasing
    tone(c, t, 1174.66, 0.09, 0.07);
    tone(c, t + 0.13, 1174.66, 0.09, 0.07);
    noiseHiss(c, t + 0.26, 5200, 2200, 0.32, 0.1);
  };

  const arrive = (c: AudioContext, index: number) => {
    const t = c.currentTime + 0.01;
    noiseHiss(c, t, 3400, 650, 0.5, 0.12);
    // the soft thunk of the train settling
    const thunk = c.createOscillator();
    const g = c.createGain();
    thunk.type = "sine";
    thunk.frequency.setValueAtTime(95, t + 0.32);
    thunk.frequency.exponentialRampToValueAtTime(48, t + 0.46);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setValueAtTime(0.3, t + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    thunk.connect(g).connect(c.destination);
    thunk.start(t);
    thunk.stop(t + 0.52);
    // station chime: a high note, then a lower one
    const f = CHIME[Math.min(CHIME.length - 1, Math.max(0, index))];
    bell(c, t + 0.45, f, 0.13, 1.1);
    bell(c, t + 0.78, f * 0.7492, 0.13, 1.3);
  };

  return {
    ride(world) {
      const c = audioReady();
      if (!c || c.state !== "running") return;
      if (typeof document !== "undefined" && document.hidden) return;
      const now = performance.now();
      const dt = Math.max(0.001, (now - prevAt) / 1000);
      const last = prev;
      prev = world;
      prevAt = now;

      const nearest = Math.round(world);
      const atRest = Math.abs(world - nearest) < REST_WITHIN;
      if (last === null) {
        if (atRest) parkedAt = nearest;
        return;
      }
      if (Math.abs(world - last) > MAX_JUMP) {
        // jumped to another stop (the route map): treat it as a fresh start
        parkedAt = atRest ? nearest : null;
        travelled = 0;
        if (atRest) arrive(c, nearest);
        return;
      }

      if (atRest && parkedAt === null) {
        parkedAt = nearest;
        arrive(c, nearest);
      } else if (!atRest && parkedAt !== null) {
        parkedAt = null;
        depart(c);
      }

      const d = Math.abs(world - last);
      if (d === 0) return;
      speed = speed * 0.7 + (d / dt) * 0.3;
      const norm = Math.min(1, speed / 1.2);

      // rail joints: one "ka-chunk" for every JOINT_EVERY of distance, so the tempo follows your scrolling
      if (!atRest) {
        travelled += d;
        let joints = 0;
        while (travelled >= JOINT_EVERY && joints < 3) {
          travelled -= JOINT_EVERY;
          joint(c, c.currentTime + joints * 0.02, 0.1 + norm * 0.1);
          joints++;
        }
        if (travelled > JOINT_EVERY) travelled = 0;

        // electric hum: climbs in pitch and loudness with speed
        const h = ensureHum(c);
        const t = c.currentTime;
        const f = 70 + norm * 150;
        h.osc.frequency.setTargetAtTime(f, t, 0.06);
        h.osc2.frequency.setTargetAtTime(f * 2, t, 0.06);
        h.filter.frequency.setTargetAtTime(300 + norm * 700, t, 0.06);
        h.gain.gain.setTargetAtTime(Math.min(HUM_PEAK, 0.01 + norm * 0.04), t, 0.08);
        clearTimeout(idle);
        idle = setTimeout(() => {
          speed = 0;
          fadeHum();
        }, IDLE_MS);
      } else {
        fadeHum();
      }
    },

    finale() {
      const c = audioReady();
      if (!c || c.state !== "running") return;
      const t = c.currentTime + 1.2; // after the station chime
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => bell(c, t + i * 0.08, f, 0.1, 1.2 - i * 0.08));
      noiseHiss(c, t, 1200, 6000, 0.7, 0.08);
    },

    dispose() {
      clearTimeout(idle);
      const c = audioReady();
      if (hum && c) {
        hum.gain.gain.cancelScheduledValues(c.currentTime);
        hum.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
        hum.osc.stop(c.currentTime + 0.15);
        hum.osc2.stop(c.currentTime + 0.15);
      }
      hum = null;
      prev = null;
      parkedAt = null;
      travelled = 0;
      speed = 0;
    },
  };
}
