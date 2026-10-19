import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

const db = vi.hoisted(() => {
  const client = {
    user: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
    event: { findMany: vi.fn(async (): Promise<unknown[]> => []), findUnique: vi.fn() },
    attendanceSession: {
      findMany: vi.fn(async (): Promise<unknown[]> => []), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn(async () => 0),
    },
    attendanceRecord: { findMany: vi.fn(async (): Promise<unknown[]> => []), createMany: vi.fn(), deleteMany: vi.fn() },
  };
  return client as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET as listDomain, POST as createDomain } from "@/app/api/attendance/route";
import { DELETE as deleteDomain, GET as readDomain, PUT as markDomain } from "@/app/api/attendance/[id]/route";
import { getMemberAttendance } from "@/lib/attendance";
import { requireUser } from "@/lib/auth";

afterEach(() => vi.clearAllMocks());

const asLead = (domain = "Web") => vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "lead1", role: "domain_admin", domain } } as never);
const req = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/attendance", { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "s1" }) };
const row = (over = {}) => ({ id: "s1", kind: "GMEET", title: "Sync", heldOn: new Date("2026-10-18T00:00:00+05:30"), hours: 1, description: null, eventId: null, domain: null, _count: { records: 0 }, ...over });

describe("domain attendance routes are for leads and co-leads only", () => {
  it("asks the guard for the domain_admin role and does nothing when it says no", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await listDomain(req("GET"))).status).toBe(403);
    expect((await createDomain(req("POST", { kind: "gmeet", title: "Sync" }))).status).toBe(403);
    expect((await markDomain(req("PUT", { userIds: ["u1"], present: true }), ctx)).status).toBe(403);
    expect((await deleteDomain(req("DELETE"), ctx)).status).toBe(403);
    for (const call of vi.mocked(requireUser).mock.calls) expect(call[1]).toEqual(["domain_admin"]);
    expect(db.attendanceRecord.createMany).not.toHaveBeenCalled();
  });
});

describe("listing", () => {
  it("shows club-wide sessions plus the lead's own domain meets, and only their members", async () => {
    asLead("Web");
    await listDomain(req("GET"));
    expect(db.attendanceSession.findMany.mock.calls[0][0].where).toEqual({ OR: [{ domain: null }, { domain: "WEB" }] });
    expect(db.user.findMany.mock.calls[0][0].where).toEqual({ domain: "WEB", isActive: true });
  });
});

describe("creating", () => {
  it("makes a meet that belongs to the lead's domain", async () => {
    asLead("Design");
    db.attendanceSession.create.mockResolvedValue(row({ domain: "DESIGN" }));
    const res = await createDomain(req("POST", { kind: "gmeet", title: "Design sync", heldOn: "2026-10-18" }));
    expect(res.status).toBe(201);
    expect(db.attendanceSession.create.mock.calls[0][0].data).toMatchObject({ kind: "GMEET", domain: "DESIGN", createdById: "lead1" });
    expect((await res.json()).session).toMatchObject({ domain: "Design" });
  });

  it("opens an event's session for the whole club, not one domain", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue(null);
    db.event.findUnique.mockResolvedValue({ id: "e1", title: "Hack Night", startsAt: new Date("2026-10-20T00:00:00Z") });
    db.attendanceSession.create.mockResolvedValue(row({ kind: "EVENT", title: "Hack Night", eventId: "e1" }));
    await createDomain(req("POST", { kind: "event", eventId: "e1" }));
    expect(db.attendanceSession.create.mock.calls[0][0].data).not.toHaveProperty("domain");
  });
});

describe("marking", () => {
  it("marks members of the lead's own domain present", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Sync", domain: null });
    db.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    db.attendanceRecord.createMany.mockResolvedValue({ count: 2 });
    const res = await markDomain(req("PUT", { userIds: ["u1", "u2"], present: true }), ctx);
    expect(await res.json()).toEqual({ success: true, changed: 2 });
    expect(db.user.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["u1", "u2"] }, domain: "WEB" });
    expect(db.attendanceRecord.createMany.mock.calls[0][0].data).toEqual([
      { sessionId: "s1", userId: "u1", markedById: "lead1" },
      { sessionId: "s1", userId: "u2", markedById: "lead1" },
    ]);
  });

  it("refuses anyone from another domain and marks nobody", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Sync", domain: null });
    db.user.findMany.mockResolvedValue([{ id: "u1" }]); // u2 is not in Web
    const res = await markDomain(req("PUT", { userIds: ["u1", "u2"], present: true }), ctx);
    expect(res.status).toBe(403);
    expect(db.attendanceRecord.createMany).not.toHaveBeenCalled();
  });

  it("refuses another domain's meet", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Design sync", domain: "DESIGN" });
    expect((await markDomain(req("PUT", { userIds: ["u1"], present: true }), ctx)).status).toBe(403);
    expect((await readDomain(req("GET"), ctx)).status).toBe(403);
    expect(db.attendanceRecord.createMany).not.toHaveBeenCalled();
  });

  it("takes a mark back for the lead's own members", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Sync", domain: null });
    db.user.findMany.mockResolvedValue([{ id: "u1" }]);
    db.attendanceRecord.deleteMany.mockResolvedValue({ count: 1 });
    await markDomain(req("PUT", { userIds: ["u1"], present: false }), ctx);
    expect(db.attendanceRecord.deleteMany).toHaveBeenCalledWith({ where: { sessionId: "s1", userId: { in: ["u1"] } } });
  });

  it("reads back only the lead's own members", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Sync", domain: null });
    db.attendanceSession.findUniqueOrThrow.mockResolvedValue(row());
    db.attendanceRecord.findMany.mockResolvedValue([{ userId: "u1" }]);
    const res = await readDomain(req("GET"), ctx);
    expect((await res.json()).userIds).toEqual(["u1"]);
    expect(db.attendanceRecord.findMany.mock.calls[0][0].where).toEqual({ sessionId: "s1", user: { domain: "WEB" } });
  });
});

describe("deleting", () => {
  it("lets a lead delete their own domain's meet", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Web sync", domain: "WEB" });
    expect((await deleteDomain(req("DELETE"), ctx)).status).toBe(200);
    expect(db.attendanceSession.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("keeps club-wide sessions and other domains' meets out of reach", async () => {
    asLead("Web");
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Club hour", domain: null });
    expect((await deleteDomain(req("DELETE"), ctx)).status).toBe(403);
    db.attendanceSession.findUnique.mockResolvedValue({ id: "s1", title: "Design sync", domain: "DESIGN" });
    expect((await deleteDomain(req("DELETE"), ctx)).status).toBe(403);
    expect(db.attendanceSession.delete).not.toHaveBeenCalled();
  });
});

describe("a member's own attendance", () => {
  it("counts only club-wide sessions and their own domain's meets as held", async () => {
    db.attendanceRecord.findMany.mockResolvedValue([]);
    await getMemberAttendance("m1", new Date("2026-10-19T00:00:00Z"), "Web");
    expect(db.attendanceSession.count.mock.calls[0][0].where).toMatchObject({ OR: [{ domain: null }, { domain: "WEB" }] });
  });
});
