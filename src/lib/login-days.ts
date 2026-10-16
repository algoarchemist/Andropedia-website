import { log } from "./logger";
import { istDay, loginStreak } from "./login-streak";
import { prisma } from "./prisma";

/**
 * Notes that a member was in the portal today. Safe to call as often as you like (a day is stored once), and it never throws:
 * a streak that cannot be saved must not stop anyone from signing in.
 */
export async function recordLoginDay(userId: string, now: Date = new Date()): Promise<void> {
  try {
    await prisma.loginDay.createMany({ data: [{ userId, day: istDay(now) }], skipDuplicates: true });
  } catch (err) {
    log.warn("Could not record a login day", { userId }, err);
  }
}

/** Every login day of the given members, as "YYYY-MM-DD" lists keyed by member id. */
export async function getLoginDays(userIds: string[]): Promise<Record<string, string[]>> {
  const rows = await prisma.loginDay.findMany({ where: { userId: { in: userIds } }, select: { userId: true, day: true } });
  const byUser: Record<string, string[]> = {};
  for (const r of rows) (byUser[r.userId] ??= []).push(r.day);
  return byUser;
}

/** The streak (consecutive days up to today) and the total number of days a member has logged in. */
export async function getLoginSummary(userId: string, now: Date = new Date()): Promise<{ streak: number; totalDays: number }> {
  const days = (await getLoginDays([userId]))[userId] ?? [];
  return { streak: loginStreak(days, istDay(now)), totalDays: days.length };
}
