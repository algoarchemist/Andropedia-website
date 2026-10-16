// Login days and the streak, kept free of any database code so they can be tested directly.
// A "day" is a calendar day in India time, written "YYYY-MM-DD", because that is where the club is.

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

/** The India-time calendar day of a moment, as "YYYY-MM-DD". */
export const istDay = (date: Date): string => dayFormat.format(date);

/** The day before a "YYYY-MM-DD" day. */
export function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/**
 * Consecutive days with a login, counting back from today. A member who has not opened the portal yet today keeps yesterday's
 * streak until the day ends, so it never reads 0 first thing in the morning.
 */
export function loginStreak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : set.has(previousDay(today)) ? previousDay(today) : null;
  let streak = 0;
  while (cursor !== null && set.has(cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }
  return streak;
}
