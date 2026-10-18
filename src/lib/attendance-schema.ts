import { z } from "zod";
import { parseCsv } from "./csv";

// Pure pieces of attendance (validation and CSV reading), kept apart from the database code so portal components and tests can import them.

/** Largest CSV accepted, in bytes and in rows. */
export const MAX_ATTENDANCE_CSV_BYTES = 512 * 1024;
export const MAX_ATTENDANCE_ROWS = 5000;

const heldOn = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date.").refine((v) => !Number.isNaN(Date.parse(v)), "Pick the date.");

const sessionTitle = z.string().trim().min(2, "Name the session.").max(120);
export const MAX_SESSION_DESCRIPTION = 300;
const sessionDescription = z.string().trim().max(MAX_SESSION_DESCRIPTION, `Keep the description under ${MAX_SESSION_DESCRIPTION} characters.`);
/** Most sessions that can be added in one go. */
export const MAX_SESSIONS_PER_ADD = 20;
const sessionCount = z.number().int().min(1).max(MAX_SESSIONS_PER_ADD, `Add at most ${MAX_SESSIONS_PER_ADD} sessions at a time.`);
const sessionHours = z.number().min(0.25, "Enter how many hours it ran.").max(24);

/** What a session is. The super admin decides which of these count as attendance, and can switch a session between the first two kinds below. */
export const SESSION_KINDS = ["event", "club_hour", "gmeet"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];
export const SESSION_KIND_LABEL: Record<SessionKind, string> = { event: "Event", club_hour: "Club hour", gmeet: "Google Meet" };

export const sessionCreateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("event"), eventId: z.string().min(1) }),
  // `heldOn` defaults to today (India) and `count` adds that many sessions at once, named "<title> 1", "<title> 2", ...
  z.object({ kind: z.literal("club_hour"), title: sessionTitle, heldOn: heldOn.optional(), hours: sessionHours.optional(), description: sessionDescription.optional(), count: sessionCount.optional() }),
  z.object({ kind: z.literal("gmeet"), title: sessionTitle, heldOn: heldOn.optional(), hours: sessionHours.optional(), description: sessionDescription.optional(), count: sessionCount.optional() }),
]);

/** Fields a super admin can change on an existing session. An event's session keeps its kind; club hours and Google Meets can switch. */
export const sessionUpdateSchema = z
  .object({
    title: sessionTitle.optional(),
    heldOn: heldOn.optional(),
    hours: sessionHours.nullable().optional(),
    description: sessionDescription.nullable().optional(),
    kind: z.enum(["club_hour", "gmeet"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const markSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Pick at least one member.").max(1000),
  present: z.boolean(),
});

export const importSchema = z.object({ csv: z.string().min(1, "Choose a CSV file.").max(MAX_ATTENDANCE_CSV_BYTES) });

/** A date picked in the portal means that day in India, where the club is. */
export const heldOnDate = (day: string) => new Date(`${day}T00:00:00+05:30`);

/** Today's date in India as YYYY-MM-DD. */
export const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export type CsvIdentifier = { kind: "registerNo" | "email"; value: string };

export type ParsedAttendanceCsv = { ok: true; identifiers: CsvIdentifier[]; blankRows: number } | { ok: false; error: string };

const normalizeRegisterNo = (v: string) => v.replace(/\s+/g, "").toUpperCase();
const normalizeEmail = (v: string) => v.trim().toLowerCase();

/**
 * Reads the people out of an attendance CSV. The first row must name its columns: one containing "register" (register_number,
 * Register No, ...) and/or one containing "email". When both are present the register number is used, and the email only
 * for rows that have none. Other columns (name, timestamps, ...) are ignored, so the event sign-up export works as it is.
 */
export function parseAttendanceCsv(text: string): ParsedAttendanceCsv {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, error: "The file is empty." };
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const regCol = header.findIndex((c) => c.includes("register") || c.replace(/[\s._-]/g, "") === "regno");
  const emailCol = header.findIndex((c) => c.includes("email") || c.includes("e-mail"));
  if (regCol < 0 && emailCol < 0) return { ok: false, error: 'The first row must name its columns, with one called "register_number" and/or one called "email".' };
  if (rows.length - 1 > MAX_ATTENDANCE_ROWS) return { ok: false, error: `Too many rows (the limit is ${MAX_ATTENDANCE_ROWS}).` };

  const identifiers: CsvIdentifier[] = [];
  let blankRows = 0;
  for (const row of rows.slice(1)) {
    const reg = regCol >= 0 ? normalizeRegisterNo(row[regCol] ?? "") : "";
    const email = emailCol >= 0 ? normalizeEmail(row[emailCol] ?? "") : "";
    if (reg) identifiers.push({ kind: "registerNo", value: reg });
    else if (email) identifiers.push({ kind: "email", value: email });
    else blankRows++;
  }
  return { ok: true, identifiers, blankRows };
}
