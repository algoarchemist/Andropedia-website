import { istDay } from "./login-streak";

// How many days remain until a deadline, in India calendar days (the club's day). Free of any browser or database code.

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const asUtcDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Whole days from today until `due`: 0 on the due day itself, negative once it has passed.
 * `due` is a "YYYY-MM-DD" day (a sprint week's end) or a timestamp (a lead's due date).
 */
export function daysLeft(due: string, now: Date = new Date()): number {
  const dueDay = DAY_ONLY.test(due) ? due : istDay(new Date(due));
  return Math.round((asUtcDay(dueDay) - asUtcDay(istDay(now))) / 86_400_000);
}

export function describeDaysLeft(days: number): string {
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  return days === -1 ? "Overdue by 1 day" : `Overdue by ${-days} days`;
}
