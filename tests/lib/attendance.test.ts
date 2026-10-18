import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

const db = vi.hoisted(() => {
  const client = {
    user: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
    event: { findMany: vi.fn(async () => []), findUnique: vi.fn() },
    attendanceSession: { findMany: vi.fn(async () => []), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    attendanceRecord: { findMany: vi.fn(async () => []), createMany: vi.fn(), deleteMany: vi.fn() },
  };
  return client as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET as listSessions, POST as createSession } from "@/app/api/admin/attendance/route";
import { PATCH as updateSession, PUT as mark } from "@/app/api/admin/attendance/[id]/route";
import { POST as importCsv } from "@/app/api/admin/attendance/[id]/import/route";
import { importAttendanceCsv } from "@/lib/attendance";
import { parseAttendanceCsv } from "@/lib/attendance-schema";
import { requireUser } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";

afterEach(() => vi.clearAllMocks());

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, CRLF, a BOM and blank lines", () => {
    expect(parseCsv('﻿name,note\r\n"Rao, N","say ""hi"""\r\n\r\nB,c\n')).toEqual([
      ["name", "note"],
      ["Rao, N", 'say "hi"'],
      ["B", "c"],
    ]);
  });
  it("keeps a final row that has no line end, and a newline inside quotes", () => {
    expect(parseCsv('a,b\n"x\ny",z')).toEqual([["a", "b"], ["x\ny", "z"]]);
  });
});

describe("parseAttendanceCsv", () => {
  it("reads register numbers and emails, ignoring other columns", () => {
    const parsed = parseAttendanceCsv("Name,Register Number,Email\nA,ra 2211,a@x.com\nB,,B@X.com\nC,,\n");
    expect(parsed).toEqual({
      ok: true,
      identifiers: [
        { kind: "registerNo", value: "RA2211" },
        { kind: "email", value: "b@x.com" },
      ],
      blankRows: 1,
    });
  });
  it("works on the event attendee export (name,email,reserved_at)", () => {
    const parsed = parseAttendanceCsv('name,email,reserved_at\n"A","a@x.com","2026-10-01"');
    expect(parsed.ok && parsed.identifiers).toEqual([{ kind: "email", value: "a@x.com" }]);
  });
  it("needs a header that names a register number or email column", () => {
    expect(parseAttendanceCsv("RA2211\nRA2212").ok).toBe(false);
    expect(parseAttendanceCsv("").ok).toBe(false);
  });
});

describe("importAttendanceCsv", () => {
  it("marks matches, reports the rest and does not double count repeats", async () => {
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1" });
    db.user.findMany.mockResolvedValue([
      { id: "u1", email: "a@x.com", registerNo: "RA2211" },
      { id: "u2", email: "b@x.com", registerNo: null },
    ]);
    db.attendanceRecord.createMany.mockResolvedValue({ count: 1 });

    const report = await importAttendanceCsv("admin", "s1", "register_number,email\nra2211,\nRA2211,\n,b@x.com\nRA9999,\n");

    expect(db.attendanceRecord.createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: "s1", userId: "u1", markedById: "admin" },
        { sessionId: "s1", userId: "u2", markedById: "admin" },
      ],
      skipDuplicates: true,
    });
    expect(report).toMatchObject({ rows: 4, marked: 1, alreadyMarked: 1, duplicates: 1, notFound: ["RA9999"], notFoundCount: 1 });
  });

  it("rejects a file without usable columns and an unknown session", async () => {
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1" });
    await expect(importAttendanceCsv("admin", "s1", "foo\nbar")).rejects.toThrow(/first row/);
    db.attendanceSession.findUnique.mockResolvedValue(null);
    await expect(importAttendanceCsv("admin", "nope", "email\na@x.com")).rejects.toThrow(/not found/);
  });
});

describe("attendance routes", () => {
  const asAdmin = () => vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "admin", role: "super_admin" } } as never);
  const asDenied = () => vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
  const req = (method: string, body?: unknown) =>
    new NextRequest("http://localhost/api/admin/attendance", { method, body: body === undefined ? undefined : JSON.stringify(body) });
  const ctx = { params: Promise.resolve({ id: "s1" }) };

  it("is super-admin only", async () => {
    asDenied();
    expect((await listSessions(req("GET"))).status).toBe(403);
    expect((await createSession(req("POST", { kind: "event", eventId: "e1" }))).status).toBe(403);
    expect((await mark(req("PUT", { userIds: ["u1"], present: true }), ctx)).status).toBe(403);
    expect((await importCsv(req("POST", { csv: "email\na@x.com" }), ctx)).status).toBe(403);
    expect(db.attendanceRecord.createMany).not.toHaveBeenCalled();
  });

  it("validates input", async () => {
    asAdmin();
    expect((await createSession(req("POST", { kind: "club_hour", title: "x", heldOn: "not a date" }))).status).toBe(400);
    expect((await mark(req("PUT", { userIds: [], present: true }), ctx)).status).toBe(400);
    expect((await importCsv(req("POST", { csv: "" }), ctx)).status).toBe(400);
  });

  it("creates a club hour and marks and unmarks members", async () => {
    asAdmin();
    db.attendanceSession.create.mockResolvedValue({ id: "s1", kind: "CLUB_HOUR", title: "Club hour", heldOn: new Date("2026-10-12T00:00:00+05:30"), hours: 1, eventId: null, _count: { records: 0 } });
    const created = await createSession(req("POST", { kind: "club_hour", title: "Club hour", heldOn: "2026-10-12" }));
    expect(created.status).toBe(201);
    expect((await created.json()).session).toMatchObject({ id: "s1", kind: "club_hour", present: 0 });

    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1" });
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.attendanceRecord.createMany.mockResolvedValue({ count: 1 });
    const on = await mark(req("PUT", { userIds: ["u1", "u1"], present: true }), ctx);
    expect(await on.json()).toEqual({ success: true, changed: 1 });

    db.attendanceRecord.deleteMany.mockResolvedValue({ count: 1 });
    await mark(req("PUT", { userIds: ["u1"], present: false }), ctx);
    expect(db.attendanceRecord.deleteMany).toHaveBeenCalledWith({ where: { sessionId: "s1", userId: { in: ["u1"] } } });
  });

  it("creates a Google Meet session", async () => {
    asAdmin();
    db.attendanceSession.create.mockResolvedValue({ id: "g1", kind: "GMEET", title: "Weekly sync", heldOn: new Date("2026-10-18T00:00:00+05:30"), hours: 1, eventId: null, _count: { records: 0 } });
    const created = await createSession(req("POST", { kind: "gmeet", title: "Weekly sync", heldOn: "2026-10-18" }));
    expect(created.status).toBe(201);
    expect(db.attendanceSession.create.mock.calls[0][0].data).toMatchObject({ kind: "GMEET", title: "Weekly sync" });
    expect((await created.json()).session).toMatchObject({ kind: "gmeet" });
  });

  it("adds several sessions at once with a shared description, dated today when no date is given", async () => {
    asAdmin();
    let n = 0;
    db.attendanceSession.create.mockImplementation(async ({ data }: { data: { title: string; description: string | null } }) => ({
      id: `n${++n}`, kind: "CLUB_HOUR", title: data.title, heldOn: new Date(), hours: 1, description: data.description, eventId: null, _count: { records: 0 },
    }));
    const res = await createSession(req("POST", { kind: "club_hour", title: "Club hour", count: 3, description: "Weekly web basics" }));
    expect(res.status).toBe(201);
    const calls = db.attendanceSession.create.mock.calls.map((c) => c[0].data);
    expect(calls.map((d: { title: string }) => d.title)).toEqual(["Club hour 1", "Club hour 2", "Club hour 3"]);
    expect(calls.every((d: { description: string }) => d.description === "Weekly web basics")).toBe(true);
    expect(calls[0].heldOn).toBeInstanceOf(Date);
    expect((await res.json()).session).toMatchObject({ id: "n1", title: "Club hour 1", description: "Weekly web basics" });
  });

  it("keeps the name as it is for a single session, and limits count and description", async () => {
    asAdmin();
    db.attendanceSession.create.mockResolvedValue({ id: "s1", kind: "GMEET", title: "Sync", heldOn: new Date(), hours: 1, description: null, eventId: null, _count: { records: 0 } });
    await createSession(req("POST", { kind: "gmeet", title: "Sync" }));
    expect(db.attendanceSession.create.mock.calls[0][0].data).toMatchObject({ title: "Sync", description: null });
    expect((await createSession(req("POST", { kind: "gmeet", title: "Sync", count: 21 }))).status).toBe(400);
    expect((await createSession(req("POST", { kind: "gmeet", title: "Sync", description: "x".repeat(301) }))).status).toBe(400);
  });

  it("edits a session's description, and clears it with an empty one", async () => {
    asAdmin();
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", kind: "EVENT" });
    db.attendanceSession.update.mockResolvedValue({ id: "s1", kind: "EVENT", title: "T", heldOn: new Date(), hours: null, description: "Hackathon day 1", eventId: "e1", _count: { records: 0 } });
    expect((await updateSession(req("PATCH", { description: "Hackathon day 1" }), ctx)).status).toBe(200);
    expect(db.attendanceSession.update.mock.calls[0][0].data).toEqual({ description: "Hackathon day 1" });
    await updateSession(req("PATCH", { description: "" }), ctx);
    expect(db.attendanceSession.update.mock.calls[1][0].data).toEqual({ description: null });
  });

  it("edits a session's name, date, hours and type, and only for a super admin", async () => {
    asDenied();
    expect((await updateSession(req("PATCH", { title: "New name" }), ctx)).status).toBe(403);

    asAdmin();
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", kind: "CLUB_HOUR" });
    db.attendanceSession.update.mockResolvedValue({ id: "s1", kind: "GMEET", title: "New name", heldOn: new Date("2026-10-20T00:00:00+05:30"), hours: 2, eventId: null, _count: { records: 3 } });
    const res = await updateSession(req("PATCH", { title: "New name", heldOn: "2026-10-20", hours: 2, kind: "gmeet" }), ctx);
    expect(res.status).toBe(200);
    expect(db.attendanceSession.update.mock.calls[0][0].data).toMatchObject({ title: "New name", hours: 2, kind: "GMEET", heldOn: new Date("2026-10-20T00:00:00+05:30") });
    expect((await res.json()).session).toMatchObject({ kind: "gmeet", present: 3 });
  });

  it("rejects an empty edit, and a type or hours change on an event's session", async () => {
    asAdmin();
    expect((await updateSession(req("PATCH", {}), ctx)).status).toBe(400);

    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", kind: "EVENT" });
    expect((await updateSession(req("PATCH", { kind: "gmeet" }), ctx)).status).toBe(409);
    expect(db.attendanceSession.update).not.toHaveBeenCalled();
    db.attendanceSession.update.mockResolvedValue({ id: "s1", kind: "EVENT", title: "Renamed", heldOn: new Date(), hours: null, eventId: "e1", _count: { records: 0 } });
    expect((await updateSession(req("PATCH", { title: "Renamed" }), ctx)).status).toBe(200);
  });

  it("answers 404 for an unknown session", async () => {
    asAdmin();
    db.attendanceSession.findUnique.mockResolvedValue(null);
    expect((await mark(req("PUT", { userIds: ["u1"], present: true }), ctx)).status).toBe(404);
  });
});
