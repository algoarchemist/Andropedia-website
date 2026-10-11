import { log } from "./logger";
import { prisma } from "./prisma";
import { checkRateLimit, peekRateLimit, type RateResult } from "./recruitment/rate-limit";

/**
 * Rate limit shared by every server instance: a fixed window counted in Postgres with one atomic
 * upsert. If the database can't be reached it falls back to the in-memory limiter, so a database
 * hiccup never blocks real users (or turns the limit off entirely).
 */
export async function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateResult> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
      INSERT INTO "RateLimit" ("key", "windowStart", "count")
      VALUES (${key}, ${new Date(now)}, 1)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" <= ${new Date(now - windowMs)} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" <= ${new Date(now - windowMs)} THEN ${new Date(now)} ELSE "RateLimit"."windowStart" END
      RETURNING "count", "windowStart"`;
    const row = rows[0];
    if (!row) throw new Error("Rate limit upsert returned no row.");
    if (row.count <= limit) return { limited: false, retryAfterSec: 0 };
    return { limited: true, retryAfterSec: Math.max(1, Math.ceil((row.windowStart.getTime() + windowMs - now) / 1000)) };
  } catch (err) {
    log.warn("Database rate limit unavailable; using the in-memory limit", { key: key.split(":")[0] }, err);
    return checkRateLimit(key, limit, windowMs, now);
  }
}

/**
 * Looks at a counter without counting a hit. Used to refuse work *before* it is done while only counting the attempts that
 * should count (failed logins). If the database can't be reached it reads the in-memory counter instead.
 */
export async function peekLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateResult> {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; windowStart: Date }>>`
      SELECT "count", "windowStart" FROM "RateLimit" WHERE "key" = ${key} AND "windowStart" > ${new Date(now - windowMs)}`;
    const row = rows[0];
    if (!row) return { limited: false, count: 0, retryAfterSec: 0 };
    if (row.count >= limit) {
      return { limited: true, count: row.count, retryAfterSec: Math.max(1, Math.ceil((row.windowStart.getTime() + windowMs - now) / 1000)) };
    }
    return { limited: false, count: row.count, retryAfterSec: 0 };
  } catch (err) {
    log.warn("Database rate limit unavailable; reading the in-memory counter", { key: key.split(":")[0] }, err);
    return peekRateLimit(key, limit, windowMs, now);
  }
}
