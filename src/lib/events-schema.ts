import { z } from "zod";
import { YEARS } from "./recruitment/schema";

/** Uploaded photos allowed per event. Lives here (not in events.ts) so portal components can import it without pulling in the database. */
export const MAX_EVENT_IMAGES = 20;

const REQUIRED = "This field is required.";
const date = z.string({ error: REQUIRED }).refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date.");

export const rsvpSchema = z.object({
  name: z.string({ error: REQUIRED }).trim().min(2, "Enter your full name.").max(80, "Enter your full name."),
  email: z.string({ error: REQUIRED }).trim().toLowerCase().max(160).pipe(z.email("Enter a valid email.")),
  // Honeypot: real users never see or fill this field.
  website: z.string().optional().default(""),
});

/** Indian mobile number: tolerates spaces, dashes and a +91 / 0 prefix; stored as 10 digits. */
const mobile = z
  .string({ error: REQUIRED })
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."));

const text = (min: number, max: number, message: string) => z.string({ error: REQUIRED }).trim().min(min, message).max(max, message);

export const teamMemberSchema = z.object({
  name: text(2, 80, "Enter the full name."),
  mobile,
  email: z.string({ error: REQUIRED }).trim().toLowerCase().max(160).pipe(z.email("Enter a valid email.")),
  dept: text(2, 60, "Enter the department."),
  section: text(1, 10, "Enter the section."),
  year: z.enum(YEARS, "Select the year of study."),
  registerNo: z
    .string({ error: REQUIRED })
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{6,20}$/, "Enter a valid register number.")),
});

export const teamRsvpSchema = z.object({
  teamName: text(2, 60, "Enter a team name."),
  // The first member is the team leader. How many are allowed depends on the event, checked server-side.
  members: z.array(teamMemberSchema).min(1, "Add at least one team member.").max(10),
  // Honeypot: real users never see or fill this field.
  website: z.string().optional().default(""),
});

const eventFields = {
  title: z.string().trim().min(3).max(160),
  type: z.string().trim().min(2).max(40),
  description: z.string().trim().min(10).max(2000),
  location: z.string().trim().min(2).max(160),
  startsAt: date,
  endsAt: date.nullable().optional(),
  capacity: z.number().int().min(1).max(100000).nullable().optional(),
  teamMin: z.number().int().min(1).max(10).nullable().optional(),
  teamMax: z.number().int().min(1).max(10).nullable().optional(),
  prize: z.string().trim().max(160).nullable().optional(),
  isPublished: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  dateTbc: z.boolean().optional(),
};

export const eventCreateSchema = z.object(eventFields);
export const eventPatchSchema = z.object(eventFields).partial();

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type TeamRsvpInput = z.infer<typeof teamRsvpSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventPatchInput = z.infer<typeof eventPatchSchema>;
