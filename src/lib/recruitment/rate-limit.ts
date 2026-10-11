// In-memory sliding window, used as the fallback for the shared database limiter (lib/rate-limit-db.ts).
// best-effort protection against bursts.

const hits = new Map<string, number[]>();

export interface RateResult {
  limited: boolean;
  /** Hits counted in the current window (only filled in by the peek functions). */
  count?: number;
  /** Seconds until the oldest hit leaves the window (for the Retry-After header). */
  retryAfterSec: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateResult {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { limited: true, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return { limited: false, retryAfterSec: 0 };
}

/** Reads the window without counting a hit: "would the next hit be refused?" and how many hits there are so far. */
export function peekRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateResult {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return { limited: true, count: recent.length, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  return { limited: false, count: recent.length, retryAfterSec: 0 };
}

/** Test helper. */
export function resetRateLimits() {
  hits.clear();
}
