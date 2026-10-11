import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ afterTasks: [] as Array<Promise<unknown>> }));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void h.afterTasks.push(Promise.resolve().then(fn)) };
});
vi.mock("@/lib/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/events")>();
  return { ...actual, rsvpToEvent: vi.fn(), rsvpTeam: vi.fn(), markRsvpEmailSent: vi.fn() };
});
// The route and error classes import the data layer; keep the real database out of these tests.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/events-email", () => ({ sendRsvpConfirmation: vi.fn(), sendTeamConfirmation: vi.fn() }));

import { POST } from "@/app/api/events/[id]/rsvp/route";
import { ConflictError, NotFoundError } from "@/lib/data-store";
import { eventStatus, markRsvpEmailSent, rsvpTeam, rsvpToEvent } from "@/lib/events";
import { sendRsvpConfirmation, sendTeamConfirmation } from "@/lib/events-email";
import { eventCreateSchema, eventPatchSchema, rsvpSchema, teamMemberSchema } from "@/lib/events-schema";
import { resetRateLimits } from "@/lib/recruitment/rate-limit";

const NOW = new Date("2026-10-10T10:00:00Z");
const base = { startsAt: new Date("2026-10-20T10:00:00Z"), endsAt: null, capacity: 3, registrationOpen: true };

describe("eventStatus", () => {
  it("is open while seats remain", () => expect(eventStatus(base, 2, NOW)).toBe("open"));
  it("is full when every seat is taken", () => expect(eventStatus(base, 3, NOW)).toBe("full"));
  it("never fills when there is no seat limit", () => expect(eventStatus({ ...base, capacity: null }, 9999, NOW)).toBe("open"));
  it("is closed when reservations are switched off", () => expect(eventStatus({ ...base, registrationOpen: false }, 0, NOW)).toBe("closed"));
  it("is past once it has ended, even if full or closed", () => {
    const past = { ...base, startsAt: new Date("2026-10-01T10:00:00Z"), endsAt: new Date("2026-10-02T10:00:00Z"), registrationOpen: false };
    expect(eventStatus(past, 3, NOW)).toBe("past");
  });
  it("is past when the date is not announced and the placeholder start is already behind us", () => {
    const placeholder = { ...base, startsAt: new Date("2026-10-01T10:00:00Z"), dateTbc: true };
    expect(eventStatus(placeholder, 0, NOW)).toBe("past");
    expect(eventStatus({ ...placeholder, registrationOpen: false }, 0, NOW)).toBe("past");
  });
  it("is coming soon (never open) when the date is not announced and the placeholder start is still ahead", () => {
    expect(eventStatus({ ...base, dateTbc: true }, 0, NOW)).toBe("soon");
    expect(eventStatus({ ...base, dateTbc: true, capacity: null }, 0, NOW)).toBe("soon");
  });
  it("uses the end time for multi-day events", () => {
    const running = { ...base, startsAt: new Date("2026-10-09T10:00:00Z"), endsAt: new Date("2026-10-11T10:00:00Z") };
    expect(eventStatus(running, 0, NOW)).toBe("open");
  });
});

describe("event schemas", () => {
  const event = { title: "Hack Night", type: "Workshop", description: "Build something in one evening.", location: "Lab 2", startsAt: "2026-10-20T10:00:00Z" };

  it("accepts a minimal event", () => expect(eventCreateSchema.safeParse(event).success).toBe(true));
  it("accepts the date-not-announced flag on create and patch", () => {
    expect(eventCreateSchema.safeParse({ ...event, dateTbc: true }).success).toBe(true);
    expect(eventPatchSchema.safeParse({ dateTbc: false }).success).toBe(true);
    expect(eventCreateSchema.safeParse({ ...event, dateTbc: "yes" }).success).toBe(false);
  });
  it("rejects a bad date", () => expect(eventCreateSchema.safeParse({ ...event, startsAt: "soon" }).success).toBe(false));
  it("rejects zero or fractional capacity", () => {
    expect(eventCreateSchema.safeParse({ ...event, capacity: 0 }).success).toBe(false);
    expect(eventCreateSchema.safeParse({ ...event, capacity: 2.5 }).success).toBe(false);
  });
  it("allows a patch with only one field", () => expect(eventPatchSchema.safeParse({ isPublished: true }).success).toBe(true));
  it("lower-cases and trims the RSVP email", () => {
    const r = rsvpSchema.parse({ name: " Priya K ", email: "  Priya@College.edu " });
    expect(r).toMatchObject({ name: "Priya K", email: "priya@college.edu" });
  });
  it("rejects an invalid RSVP email", () => expect(rsvpSchema.safeParse({ name: "Priya K", email: "nope" }).success).toBe(false));
});

let ipCounter = 0;
function rsvp(body: unknown, id = "ev1") {
  return POST(
    new NextRequest(`http://localhost/api/events/${id}/rsvp`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ipCounter}` },
    }),
    { params: Promise.resolve({ id }) }
  );
}
const person = { name: "Priya K", email: "priya@college.edu" };
const result = { rsvpId: "r1", event: { id: "ev1", title: "Hack Night", location: "Lab 2", startsAt: new Date(), endsAt: null } };

beforeEach(() => {
  resetRateLimits();
  h.afterTasks.length = 0;
  vi.mocked(rsvpToEvent).mockResolvedValue(result);
  vi.mocked(sendRsvpConfirmation).mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/events/:id/rsvp", () => {
  it("reserves a seat, returns 201, then emails and marks the reservation", async () => {
    const res = await rsvp(person);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ success: true, eventTitle: "Hack Night" });
    expect(rsvpToEvent).toHaveBeenCalledWith("ev1", person);
    await Promise.all(h.afterTasks.splice(0));
    expect(sendRsvpConfirmation).toHaveBeenCalledTimes(1);
    expect(markRsvpEmailSent).toHaveBeenCalledWith("r1");
  });

  it("still succeeds when the confirmation email fails", async () => {
    vi.mocked(sendRsvpConfirmation).mockRejectedValue(new Error("smtp down"));
    expect((await rsvp(person)).status).toBe(201);
    await Promise.all(h.afterTasks.splice(0));
    expect(markRsvpEmailSent).not.toHaveBeenCalled();
  });

  it("maps a full or closed event to 409 with the message", async () => {
    vi.mocked(rsvpToEvent).mockRejectedValue(new ConflictError("Sorry, this event is full."));
    const res = await rsvp(person);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Sorry, this event is full.");
    expect(sendRsvpConfirmation).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown or unpublished event", async () => {
    vi.mocked(rsvpToEvent).mockRejectedValue(new NotFoundError("Event not found."));
    expect((await rsvp(person, "nope")).status).toBe(404);
  });

  it("rejects bad input with 400 and field errors, touching nothing", async () => {
    const res = await rsvp({ name: "P", email: "nope" });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors).toBeDefined();
    expect(rsvpToEvent).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body", async () => {
    expect((await rsvp("not json")).status).toBe(400);
  });

  it("fakes success for bots that fill the honeypot, saving and emailing nothing", async () => {
    const res = await rsvp({ ...person, website: "http://spam.example" });
    expect(res.status).toBe(201);
    expect(rsvpToEvent).not.toHaveBeenCalled();
    expect(sendRsvpConfirmation).not.toHaveBeenCalled();
  });

  it("rate-limits one IP after 10 reservations an hour", async () => {
    const send = () =>
      POST(
        new NextRequest("http://localhost/api/events/ev1/rsvp", {
          method: "POST",
          body: JSON.stringify(person),
          headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
        }),
        { params: Promise.resolve({ id: "ev1" }) }
      );
    for (let i = 0; i < 10; i++) expect((await send()).status).toBe(201);
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("team member schema", () => {
  const m = { name: "Priya K", mobile: "98765 43210", email: "Priya@College.edu", dept: "CSE", section: "B", year: "second", registerNo: "ra2411028020094" };

  it("normalises the mobile number, email and register number", () => {
    expect(teamMemberSchema.parse(m)).toMatchObject({ mobile: "9876543210", email: "priya@college.edu", registerNo: "RA2411028020094" });
  });
  it("accepts a +91 prefix", () => expect(teamMemberSchema.parse({ ...m, mobile: "+91-98765-43210" }).mobile).toBe("9876543210"));
  it("rejects a mobile that is not a valid Indian number", () => {
    expect(teamMemberSchema.safeParse({ ...m, mobile: "12345" }).success).toBe(false);
    expect(teamMemberSchema.safeParse({ ...m, mobile: "5876543210" }).success).toBe(false);
  });
  it("requires every field", () => {
    for (const k of ["name", "mobile", "email", "dept", "section", "year", "registerNo"] as const) {
      expect(teamMemberSchema.safeParse({ ...m, [k]: "" }).success).toBe(false);
    }
  });
});

describe("POST /api/events/:id/rsvp (team)", () => {
  const member = (n: number) => ({ name: `Member ${n}`, mobile: "9876543210", email: `m${n}@college.edu`, dept: "CSE", section: "B", year: "second", registerNo: `RA24110280200${n}0` });
  const team = { teamName: "Null Pointers", members: [member(1), member(2), member(3)] };

  beforeEach(() => {
    vi.mocked(rsvpTeam).mockResolvedValue(result);
    vi.mocked(sendTeamConfirmation).mockResolvedValue(undefined);
  });

  it("registers the team, then emails every member once", async () => {
    const res = await rsvp(team);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ success: true, teamName: "Null Pointers" });
    expect(rsvpTeam).toHaveBeenCalledWith("ev1", expect.objectContaining({ teamName: "Null Pointers" }));
    expect(rsvpToEvent).not.toHaveBeenCalled();
    await Promise.all(h.afterTasks.splice(0));
    expect(sendTeamConfirmation).toHaveBeenCalledTimes(3);
    expect(markRsvpEmailSent).toHaveBeenCalledWith("r1");
  });

  it("maps team rule violations to 409 with the message", async () => {
    vi.mocked(rsvpTeam).mockRejectedValue(new ConflictError("Teams must have 3 to 4 members."));
    const res = await rsvp(team);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Teams must have 3 to 4 members.");
  });

  it("rejects a team with a missing field, touching nothing", async () => {
    const res = await rsvp({ ...team, members: [{ ...member(1), section: "" }, member(2), member(3)] });
    expect(res.status).toBe(400);
    expect(rsvpTeam).not.toHaveBeenCalled();
  });

  it("rejects an empty team name", async () => {
    expect((await rsvp({ ...team, teamName: " " })).status).toBe(400);
  });

  it("fakes success for bots that fill the honeypot", async () => {
    expect((await rsvp({ ...team, website: "http://spam.example" })).status).toBe(201);
    expect(rsvpTeam).not.toHaveBeenCalled();
  });

});
