import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ afterTasks: [] as Array<Promise<unknown>> }));

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void h.afterTasks.push(Promise.resolve().then(fn)) };
});
vi.mock("@/lib/member-invite", () => ({ sendMemberInvite: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn(), listAudit: vi.fn(async () => []) }));

const db = vi.hoisted(() => {
  const client: Record<string, unknown> = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(async () => []), update: vi.fn(), count: vi.fn(), create: vi.fn() },
    session: { deleteMany: vi.fn() },
    week: { findMany: vi.fn(async () => []), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
    event: { findMany: vi.fn(async () => []) },
    project: { findMany: vi.fn(async () => []) },
  };
  client.$transaction = (fn: (tx: unknown) => unknown) => fn(client);
  return client as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET as audit } from "@/app/api/admin/audit/route";
import { GET as events } from "@/app/api/admin/events/route";
import { GET as members, POST as addMember } from "@/app/api/admin/members/route";
import { PATCH as patchMember } from "@/app/api/admin/members/[id]/route";
import { GET as projects } from "@/app/api/admin/projects/route";
import { GET as weeks, POST as createWeek } from "@/app/api/admin/weeks/route";
import { DELETE as deleteWeek, PATCH as patchWeek } from "@/app/api/admin/weeks/[id]/route";
import { requireUser } from "@/lib/auth";
import { sendMemberInvite } from "@/lib/member-invite";

const req = (method = "GET", body?: unknown) =>
  new NextRequest("http://localhost/api/admin/x", { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "target" }) };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.clearAllMocks());

describe("every admin endpoint is super-admin only", () => {
  const routes: Array<[string, () => Promise<Response>]> = [
    ["GET audit", () => audit(req())],
    ["GET events", () => events(req())],
    ["GET members", () => members(req())],
    ["GET projects", () => projects(req())],
    ["GET weeks", () => weeks(req())],
    ["POST weeks", () => createWeek(req("POST", {}))],
    ["PATCH week", () => patchWeek(req("PATCH", { isActive: true }), ctx)],
    ["DELETE week", () => deleteWeek(req("DELETE"), ctx)],
    ["POST member", () => addMember(req("POST", {}))],
    ["PATCH member", () => patchMember(req("PATCH", { role: "member" }), ctx)],
  ];

  it.each(routes)("%s answers 401/403 and reads nothing when the guard says no", async (_name, call) => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await call()).status).toBe(403);
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["super_admin"]);
    for (const model of Object.values(db)) {
      if (typeof model === "object") for (const fn of Object.values(model)) expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("PATCH /api/admin/members/[id] safety rules", () => {
  const target = (over = {}) => ({ id: "target", role: "SUPER_ADMIN", isActive: true, position: "MEMBER", domain: "WEB", ...over });

  it("won't let an admin demote or deactivate themselves", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "target", role: "super_admin" } } as never);
    db.user.findUnique.mockResolvedValue(target());
    db.user.count.mockResolvedValue(2);
    expect((await patchMember(req("PATCH", { role: "member" }), ctx)).status).toBe(403);
    expect((await patchMember(req("PATCH", { isActive: false }), ctx)).status).toBe(403);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("protects the last active super admin", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "other", role: "super_admin" } } as never);
    db.user.findUnique.mockResolvedValue(target());
    db.user.count.mockResolvedValue(1);
    expect((await patchMember(req("PATCH", { role: "member" }), ctx)).status).toBe(403);
  });

  it("deactivating a member signs them out everywhere", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "boss", role: "super_admin" } } as never);
    db.user.findUnique.mockResolvedValue(target({ role: "MEMBER" }));
    db.user.count.mockResolvedValue(2);
    db.user.update.mockResolvedValue({
      ...target({ role: "MEMBER", isActive: false }), name: "M", email: "m@c.edu", avatar: null, bio: null, github: null, linkedin: null,
      portfolio: null, points: 0, tasksCompleted: 0, streakWeeks: 0,
    });
    expect((await patchMember(req("PATCH", { isActive: false }), ctx)).status).toBe(200);
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "target" } });
  });

  it("rejects values outside the allowed lists", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "boss", role: "super_admin" } } as never);
    expect((await patchMember(req("PATCH", { role: "root" }), ctx)).status).toBe(400);
  });
});

describe("POST /api/admin/members (add a member)", () => {
  const body = { name: "Diya Patel", email: "Diya@College.edu", registerNo: "ra 2511026020030", domain: "Design" };
  const created = {
    id: "n1", name: "Diya Patel", email: "diya@college.edu", role: "MEMBER", domain: "DESIGN", position: "MEMBER", avatar: null, bio: null,
    github: null, linkedin: null, portfolio: null, points: 0, tasksCompleted: 0, streakWeeks: 0, isActive: true,
  };
  beforeEach(() => vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "boss", role: "super_admin" } } as never));

  it("creates the member with a lower-cased email and the member role by default", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue(created);
    const res = await addMember(req("POST", body));
    expect(res.status).toBe(201);
    const data = db.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: "diya@college.edu", registerNo: "RA2511026020030", role: "MEMBER", domain: "DESIGN" });
    expect(data.passwordHash).toMatch(/^scrypt\$/);
  });

  it("emails the new member a welcome after adding them, and a mail failure does not undo it", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue(created);
    vi.mocked(sendMemberInvite).mockRejectedValue(new Error("smtp down"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const res = await addMember(req("POST", body));
    await Promise.all(h.afterTasks.splice(0));
    expect(res.status).toBe(201);
    expect(sendMemberInvite).toHaveBeenCalledWith(expect.objectContaining({ email: "diya@college.edu" }));
  });

  it("accepts any email provider", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ ...created, email: "diya@gmail.com" });
    expect((await addMember(req("POST", { ...body, email: "diya@gmail.com" }))).status).toBe(201);
  });

  it("refuses an email or register number that already belongs to a member", async () => {
    db.user.findFirst.mockResolvedValue({ email: "diya@college.edu" });
    expect((await addMember(req("POST", body))).status).toBe(409);
    db.user.findFirst.mockResolvedValue({ email: "someone.else@college.edu" });
    const res = await addMember(req("POST", body));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/register number/);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("rejects a bad email or domain", async () => {
    expect((await addMember(req("POST", { ...body, email: "nope" }))).status).toBe(400);
    expect((await addMember(req("POST", { ...body, domain: "Cooking" }))).status).toBe(400);
    expect((await addMember(req("POST", { ...body, registerNo: "" }))).status).toBe(400);
  });
});

describe("DELETE /api/admin/weeks/[id]", () => {
  beforeEach(() => vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "admin", role: "super_admin" } } as never));

  it("deletes a week nobody has submitted to", async () => {
    db.week.findUnique.mockResolvedValue({ weekNumber: 9, _count: { tasks: 0 } });
    expect((await deleteWeek(req("DELETE"), ctx)).status).toBe(200);
    expect(db.week.delete).toHaveBeenCalledWith({ where: { id: "target" } });
  });

  it("refuses while members have submissions, so no work is lost", async () => {
    db.week.findUnique.mockResolvedValue({ weekNumber: 9, _count: { tasks: 2 } });
    const res = await deleteWeek(req("DELETE"), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/submissions/);
    expect(db.week.delete).not.toHaveBeenCalled();
  });

  it("answers 409 when a submission lands between the check and the delete", async () => {
    db.week.findUnique.mockResolvedValue({ weekNumber: 9, _count: { tasks: 0 } });
    db.week.delete.mockRejectedValue(Object.assign(new Error("fk"), { code: "P2003" }));
    expect((await deleteWeek(req("DELETE"), ctx)).status).toBe(409);
  });

  it("answers 404 for a week that does not exist", async () => {
    db.week.findUnique.mockResolvedValue(null);
    expect((await deleteWeek(req("DELETE"), ctx)).status).toBe(404);
  });
});
