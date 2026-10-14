// Geometry for the rotary-dial menu. Angles are in degrees, measured clockwise from 12 o'clock.
//
// On a real rotary phone you put a finger in a hole, turn the dial clockwise until the hole reaches the finger
// stop, then let go and the dial spins back. Each page is a ring on the dial. The rings sit counter-clockwise of
// the finger stop, so pulling one clockwise brings it round to the stop. Ring 1 needs the smallest pull, the last
// ring the biggest. Both layouts show only the lower half of the dial, hanging from the top edge of the screen next
// to the menu handle (the dial's centre is the top edge, the upper half is off screen). The phone's is wider than
// tall, with smaller rings and the finger stop a little lower so the logo does not cover it.

export interface DialLayout {
  /** Where the finger stop sits. */
  stop: number;
  /** Degrees ring 1 must turn to reach the stop, and how much more each next ring needs. */
  first: number;
  step: number;
  /** Letting go this many degrees short of the stop still counts: the "catch wedge". */
  catchDeg: number;
}

/** Phone: half dial about 380 px wide, stop on the left rim below the logo, 70 px rings on a 140 px track 32 degrees apart (about 7 px between rings). */
export const PHONE_LAYOUT: DialLayout = { stop: 245, first: 36, step: 32, catchDeg: 12 };
/** Desktop: lower half of a compact dial, stop on the far-left rim (270 would be exactly 9 o'clock), 86 px rings on a 220 px track 32 degrees apart (about 35 px between rings). */
export const DESKTOP_LAYOUT: DialLayout = { stop: 258, first: 32, step: 32, catchDeg: 10 };

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

/** Degrees a ring (0-based) must be turned clockwise to touch the finger stop. */
export const requiredRotation = (layout: DialLayout, index: number) => layout.first + layout.step * index;

/** Where a ring sits when the dial is at rest. */
export const holeAngle = (layout: DialLayout, index: number) => wrap(layout.stop - requiredRotation(layout, index));

// A ring that is turned past the left end of the half dial does not vanish off the top of the screen: it comes back
// in from the right end. The jump is hidden: the ring is already leaving the screen when it fades out on the left (a
// ring is fully above the top edge at about 284 degrees), and it is still entering when it fades in on the right
// (it first fits fully on screen at about 104 degrees). So no ring ever pops.
/** The span of angles in which a ring is drawn: 180 degrees, from just right of 3 o'clock round the bottom to just past 9 o'clock. */
export const VISIBLE_FROM = 104;
export const VISIBLE_TO = 284;
/** The ring stays solid up to here (past both fingers stops), then fades out on its way off the left end. */
export const FADE_OUT_FROM = 262;
/** Degrees over which it fades in again after entering at the right end. */
export const FADE_IN_SPAN = 16;

/** Where a ring is drawn: its angle brought into the visible span. */
export const visibleAngle = (angle: number) => ((((angle - VISIBLE_FROM) % 180) + 180) % 180) + VISIBLE_FROM;

/** 0 at a ring's hidden end of the visible span and 1 when it is fully shown, eased so there is no visible kink. */
export const edgeFade = (visible: number) => {
  const t = Math.max(0, Math.min(1, (visible - VISIBLE_FROM) / FADE_IN_SPAN, (VISIBLE_TO - visible) / (VISIBLE_TO - FADE_OUT_FROM)));
  return t * t * (3 - 2 * t);
};

/** Point on a circle of radius `r` around (cx, cy) at `angle`. */
export const polar = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

/** Angle of a pointer at (dx, dy) from the dial centre, clockwise from 12 o'clock, 0..360. */
export const pointerAngle = (dx: number, dy: number) => wrap((Math.atan2(dx, -dy) * 180) / Math.PI);

/** Signed shortest turn from one angle to another, in (-180, 180]. Lets a drag cross 12 o'clock cleanly. */
export const shortestDelta = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

/** Adds a drag step to the current turn. The dial only turns clockwise from rest, and the finger stop blocks it. */
export const advance = (turn: number, delta: number, required: number) => Math.min(required, Math.max(0, turn + delta));

/** How far past the finger stop the pointer is allowed to run on ahead of the ring (the ring itself stays blocked at the stop). */
export const OVERSHOOT = 90;

/**
 * Adds a drag step to how far the pointer has pulled (`raw`) and works out where the ring is. The ring is blocked at the finger
 * stop, but the pointer is not: if you pull past the stop and ease back, the ring stays at the stop until the pointer is back
 * before it, like a real dial under a finger. (Without this, easing back from an overshoot made the ring look short of the stop
 * and letting go did nothing.)
 */
export const pull = (raw: number, delta: number, required: number) => {
  const next = Math.min(required + OVERSHOOT, Math.max(0, raw + delta));
  return { raw: next, turn: Math.min(required, next) };
};

/** True once the ring is at (or within `tolerance` degrees of) the finger stop. */
export const reachedStop = (turn: number, required: number, tolerance = 4) => turn >= required - tolerance;

/** How long the dial takes to spin back from `turn` degrees: about as long as a real one, never abrupt. */
export const returnSeconds = (turn: number) => Math.max(0.3, (turn / 360) * 1.1);
