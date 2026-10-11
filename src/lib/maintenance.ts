import { prisma } from "./prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
/** "Known device" markers for logins last 30 days (see api/auth/login), so they are kept a little longer than that. */
const KNOWN_DEVICE_KEEP_MS = 31 * DAY_MS;

/**
 * Deletes expired sessions, login codes and password-reset links, and rate-limit counters that no longer matter. Safe to run
 * as often as you like; vercel.json schedules it daily.
 */
export async function purgeExpired(now = new Date()) {
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const [sessions, codes, resets, limits, knownDevices] = await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.loginCode.deleteMany({ where: { createdAt: { lt: dayAgo } } }),
    prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.rateLimit.deleteMany({ where: { windowStart: { lt: dayAgo }, NOT: { key: { startsWith: "login-known:" } } } }),
    prisma.rateLimit.deleteMany({ where: { key: { startsWith: "login-known:" }, windowStart: { lt: new Date(now.getTime() - KNOWN_DEVICE_KEEP_MS) } } }),
  ]);
  return {
    expiredSessions: sessions.count,
    oldLoginCodes: codes.count,
    expiredPasswordResets: resets.count,
    oldRateLimits: limits.count + knownDevices.count,
  };
}
