// Timeline and shapes for the intro (from andropedia-preloader.html, redrawn with the real Andropedia logo). Everything is a pure
// function of elapsed time in milliseconds, so frames that arrive late simply show a later moment instead of slowing the animation.
//
//   type    a fake address bar grows out of a caret, types a long messy link, deletes the extra parts and presses Enter
//   mark    the bar collapses to a caret, which becomes a play triangle, which unfolds into the "A" of the logo
//   logo    the cloud, circuit lines and nodes draw in, the wordmark sweeps through, and the logo flies to the navbar
//
// The old design waited here for a click on the play triangle; now the triangle holds for HOLD ms and the intro carries on by itself.

export const URL_STR = "https://andropedia-rmp.vercel.app/?ref=club&utm_source=rmp&utm_campaign=join-2026#hero";
export const KEEP = 33; // "https://andropedia-rmp.vercel.app" is what stays after the deleting
export const DOM0 = 8; // where the domain starts ("https://" is muted)
export const DOM1 = 33; // where it ends (the rest is muted)
const L = URL_STR.length;

// A fixed pseudo-random typing rhythm (about 8 to 13 ms a character), the same on every visit.
function typingTimes(start: number): number[] {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const out: number[] = [];
  let acc = start;
  for (let i = 0; i < L; i++) {
    acc += 8 + rnd() * 5;
    out.push(acc);
  }
  return out;
}

export const EX0 = 150; // the caret starts to widen into the address bar
export const EX1 = 500; // ...and is a full bar
export const TY0 = 520; // typing starts
const TT = typingTimes(TY0);
export const TYPE_END = TT[L - 1];
export const DEL0 = TYPE_END + 90;
export const DEL_RATE = 4; // ms per backspace
export const DEL_END = DEL0 + (L - KEEP) * DEL_RATE;
export const ENTER = DEL_END + 90;
export const COL0 = ENTER + 80; // the bar starts to collapse
export const COL1 = COL0 + 450; // ...into a caret
export const MOR1 = COL1 + 450; // the caret has become the play triangle
export const HOLD = 350; // how long the triangle waits, in place of waiting for a click
export const TC = MOR1 + HOLD; // the moment the triangle starts to become the logo (the old "click")

// Everything after TC is measured from it.
export const FLY0 = 1800;
export const FLY_DUR = 1750; // the flight to the navbar: unhurried
export const DOCK = FLY0 + FLY_DUR;
// The black fades away (and the page behind comes in) only once the logo has landed, so the flight is never competing with the
// page's own rendering for the frame budget.
export const BG0 = DOCK - 150;
export const BG_DUR = 650;
export const HERO0 = BG0 + 150;
export const END = BG0 + BG_DUR + 200; // the black has finished fading and the drawn logo has faded out

/** How many characters of the address are showing at time T. */
export function nChars(T: number): number {
  if (T < TY0) return 0;
  if (T <= TYPE_END) {
    let n = 0;
    while (n < L && TT[n] <= T) n++;
    return n;
  }
  if (T < DEL0) return L;
  if (T < DEL_END) return Math.max(KEEP, L - Math.floor((T - DEL0) / DEL_RATE));
  return KEEP;
}

export const TOTAL_MS = TC + END;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = {
  io: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  /** Smootherstep: eases gently out of the start and into the end, with no sudden change of speed. */
  smooth: (p: number) => p * p * p * (p * (p * 6 - 15) + 10),
  back: (p: number) => {
    const c = 1.1;
    const c3 = c + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
  },
};

// ---- the logo's shapes, in the logo's own coordinates (the same drawing as components/design/AndropediaMark) ----------------
export type Pt = [number, number];

/** The A: an outer shape of four points and a triangular hole. */
export const A_OUTER: Pt[] = [
  [517, 300],
  [645, 541],
  [803, 500],
  [268, 780],
];
export const A_HOLE: Pt[] = [
  [517, 455],
  [580, 558],
  [438, 607],
];
/** The play triangle: four points, two of them together at the tip, so it can unfold into the four points of the A. */
export const TRIANGLE: Pt[] = [
  [420, 380],
  [690, 540],
  [690, 540],
  [420, 700],
];
/** The caret: a thin bar through the middle of the triangle (same four points, so the bar can widen into the triangle). */
export const CARET: Pt[] = [
  [553.8, 500],
  [556.2, 500],
  [556.2, 580],
  [553.8, 580],
];
/** The hole starts as a point at its own middle and opens into the triangle. */
export const HOLE_START: Pt[] = [
  [511.7, 540],
  [511.7, 540],
  [511.7, 540],
];
/** The small arrowhead under the A. */
export const ARROWHEAD: Pt[] = [
  [687, 622],
  [757, 775],
  [590, 690],
];
export const PC: Pt = [555, 540]; // the middle of the caret / triangle

export const FINAL_VB = [180, 90, 760, 710] as const;
/** The camera starts centred on the triangle, then pans out to frame the whole logo. */
export const START_VB = [PC[0] - FINAL_VB[2] / 2, PC[1] - FINAL_VB[3] / 2, FINAL_VB[2], FINAL_VB[3]] as const;

export const mixPts = (a: Pt[], b: Pt[], t: number): Pt[] => a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)] as Pt);
export const polyPath = (p: Pt[]) => p.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join("") + "Z";
export const markPath = (outer: Pt[], hole: Pt[]) => polyPath(outer) + polyPath(hole);

// The circuit and cloud strokes of the logo, drawn in as lines.
export const CLOUD_D = "M312 574 C 214 546 200 420 252 352 C 290 306 342 296 384 304 C 376 196 450 124 534 124 C 612 124 664 170 690 230 H 766 L 836 166";
export const STUB_MID_D = "M638 324 H838";
export const STUB_LOW_D = "M683 415 H788 L838 463";
export const NODES = [
  { cx: 848, cy: 148, r: 26, sw: 20, halo: 46 },
  { cx: 875, cy: 324, r: 27.5, sw: 21, halo: 60 },
  { cx: 858, cy: 500, r: 27.5, sw: 21, halo: 0 },
] as const;
