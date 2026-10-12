import { z } from "zod";
import { parseCsv } from "./csv";

// Pure pieces of attendance (validation and CSV reading), kept apart from the database code so portal components and tests can import them.

/** Largest CSV accepted, in bytes and in rows. */
export const MAX_ATTENDANCE_CSV_BYTES = 512 * 1024;
export const MAX_ATTENDANCE_ROWS = 5000;

const heldOn = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date.").refine((v) => !Number.isNaN(Date.parse(v)), "Pick the date.");

export const sessionCreateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("event"), eventId: z.string().min(1) }),
  z.object({
    kind: z.literal("club_hour"),
    title: z.string().trim().min(2, "Name the club hour.").max(120),
    heldOn,
    hours: z.number().min(0.25, "Enter how many hours it ran.").max(24).optional(),
  }),
]);

export const markSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Pick at least one member.").max(1000),
  present: z.boolean(),
});

export const importSchema = z.object({ csv: z.string().min(1, "Choose a CSV file.").max(MAX_ATTENDANCE_CSV_BYTES) });

/** A date picked in the portal means that day in India, where the club is. */
export const heldOnDate = (day: string) => new Date(`${day}T00:00:00+05:30`);

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
