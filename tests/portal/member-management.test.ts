import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: () => undefined };
});
vi.mock("@/lib/member-invite", () => ({ sendMemberInvite: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn(), listAudit: vi.fn(async () => []) }));

const db = vi.hoisted(() => {
  const client: Record<string, unknown> = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    memberPhoto: { upsert: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() },
    session: { deleteMany: vi.fn() },
  };
  client.$transaction = (fn: (tx: unknown) => unknown) => fn(client);
  return client as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST as addMember } from "@/app/api/admin/members/route";
import { DELETE as deleteMember, PATCH as patchMember } from "@/app/api/admin/members/[id]/route";
import { DELETE as deletePhoto, PUT as putPhoto } from "@/app/api/admin/members/[id]/photo/route";
import { GET as getPhoto } from "@/app/api/member-photo/user/[id]/route";
import { requireUser } from "@/lib/auth";

const req = (method = "GET", body?: unknown) =>
  new NextRequest("http://localhost/api/admin/x", { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "target" }) };
const asAdmin = (id = "boss") => vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id, role: "super_admin" } } as never);

const row = (over = {}) => ({
  id: "target", name: "Nithin Rao", email: "n@c.edu", role: "MEMBER", domain: "WEB", position: "LEAD", avatar: null, bio: null,
  github: null, linkedin: null, portfolio: null, points: 0, tasksCompleted: 0, streakWeeks: 0, isActive: true, ...over,
});

beforeEach(() => {
  asAdmin();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.clearAllMocks());

describe("member profile fields", () => {
  const body = { name: "Nithin Rao", email: "n@c.edu", registerNo: "RA2511026020001", domain: "Web" };

  it("adding a member saves the description, position and a cleaned LinkedIn link", async () => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue(row());
    const res = await addMember(req("POST", { ...body, position: "lead", bio: "  Builds things.  ", linkedin: "linkedin.com/in/nithin/" }));
    expect(res.status).toBe(201);
    expect(db.user.create.mock.calls[0][0].data).toMatchObject({ bio: "Builds things.", linkedin: "https://linkedin.com/in/nithin", position: "LEAD" });
  });

  it("rejects a LinkedIn link that is not LinkedIn, and an over-long description", async () => {
    expect((await addMember(req("POST", { ...body, linkedin: "https://example.com/in/x" }))).status).toBe(400);
    expect((await addMember(req("POST", { ...body, bio: "x".repeat(601) }))).status).toBe(400);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("editing updates the name, description and LinkedIn; empty values clear them", async () => {
    db.user.findUnique.mockResolvedValue(row());
    db.user.count.mockResolvedValue(2);
    db.user.update.mockResolvedValue(row({ name: "N Rao" }));
    const res = await patchMember(req("PATCH", { name: " N Rao ", bio: "", linkedin: "" }), ctx);
    expect(res.status).toBe(200);
    expect(db.user.update.mock.calls[0][0].data).toMatchObject({ name: "N Rao", bio: null, linkedin: null });
  });
});

describe("DELETE /api/admin/members/[id]", () => {
  const target = (over = {}) => ({ id: "target", name: "T", role: "MEMBER", isActive: true, domain: "WEB", ...over });

  it("removes a member", async () => {
    db.user.findUnique.mockResolvedValue(target());
    db.user.count.mockResolvedValue(2);
    expect((await deleteMember(req("DELETE"), ctx)).status).toBe(200);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "target" } });
  });

  it("will not remove yourself or the last super admin", async () => {
    asAdmin("target");
    db.user.findUnique.mockResolvedValue(target({ role: "SUPER_ADMIN" }));
    db.user.count.mockResolvedValue(1);
    expect((await deleteMember(req("DELETE"), ctx)).status).toBe(403);
    asAdmin("boss");
    expect((await deleteMember(req("DELETE"), ctx)).status).toBe(403);
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it("says to deactivate when the member has graded work", async () => {
    db.user.findUnique.mockResolvedValue(target());
    db.user.count.mockResolvedValue(2);
    db.user.delete.mockRejectedValue(Object.assign(new Error("fk"), { code: "P2003" }));
    const res = await deleteMember(req("DELETE"), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Deactivate/);
  });

  it("404s for an unknown member", async () => {
    db.user.findUnique.mockResolvedValue(null);
    expect((await deleteMember(req("DELETE"), ctx)).status).toBe(404);
  });
});

describe("member photos", () => {
  const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const put = (body: BodyInit) => new NextRequest("http://localhost/api/admin/members/target/photo", { method: "PUT", body });

  it("stores a valid image and points the member's avatar at it", async () => {
    db.user.findUnique.mockResolvedValue({ id: "target" });
    db.user.update.mockResolvedValue(row({ avatar: "/api/member-photo/user/target?v=1" }));
    const res = await putPhoto(put(JPEG), ctx);
    expect(res.status).toBe(200);
    expect(db.memberPhoto.upsert.mock.calls[0][0].create).toMatchObject({ userId: "target", mime: "image/jpeg" });
    expect(db.user.update.mock.calls[0][0].data.avatar).toMatch(/^\/api\/member-photo\/user\/target\?v=\d+$/);
  });

  it("refuses files that are not JPEG, PNG or WebP, whatever they claim to be", async () => {
    const res = await putPhoto(put(new TextEncoder().encode("<svg onload=alert(1)>")), ctx);
    expect(res.status).toBe(415);
    expect(db.memberPhoto.upsert).not.toHaveBeenCalled();
  });

  it("refuses an empty or oversized upload", async () => {
    expect((await putPhoto(put(new Uint8Array()), ctx)).status).toBe(400);
    expect((await putPhoto(put(new Uint8Array(401 * 1024)), ctx)).status).toBe(413);
  });

  it("removing a picture clears the avatar", async () => {
    db.user.findUnique.mockResolvedValue({ id: "target" });
    db.user.update.mockResolvedValue(row());
    expect((await deletePhoto(req("DELETE"), ctx)).status).toBe(200);
    expect(db.memberPhoto.deleteMany).toHaveBeenCalledWith({ where: { userId: "target" } });
    expect(db.user.update.mock.calls[0][0].data).toEqual({ avatar: null });
  });

  it("serves a stored picture publicly with long-lived caching, and 404s when there is none", async () => {
    db.memberPhoto.findUnique.mockResolvedValue({ userId: "target", mime: "image/jpeg", data: Buffer.from(JPEG) });
    const ok = await getPhoto(new Request("http://localhost/x"), ctx);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/jpeg");
    expect(ok.headers.get("cache-control")).toMatch(/immutable/);
    expect(requireUser).not.toHaveBeenCalled();
    db.memberPhoto.findUnique.mockResolvedValue(null);
    expect((await getPhoto(new Request("http://localhost/x"), ctx)).status).toBe(404);
  });
});

describe("the new endpoints are super-admin only", () => {
  const calls: Array<[string, () => Promise<Response>]> = [
    ["DELETE member", () => deleteMember(req("DELETE"), ctx)],
    ["PUT photo", () => putPhoto(req("PUT"), ctx)],
    ["DELETE photo", () => deletePhoto(req("DELETE"), ctx)],
  ];
  it.each(calls)("%s answers 403 and touches nothing", async (_name, call) => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await call()).status).toBe(403);
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["super_admin"]);
    for (const model of Object.values(db)) if (typeof model === "object") for (const fn of Object.values(model)) expect(fn).not.toHaveBeenCalled();
  });
});
