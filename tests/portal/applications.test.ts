import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/recruitment/decision", async (importOriginal) => ({ ...(await importOriginal<object>()), sendDecision: vi.fn() }));

const db = vi.hoisted(() => ({
  application: { findMany: vi.fn(async (_args?: { where?: unknown }) => []), findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET as list } from "@/app/api/applications/route";
import { PATCH as decide } from "@/app/api/applications/[id]/route";
import { requireUser } from "@/lib/auth";
import { sendDecision } from "@/lib/recruitment/decision";
import { applicationScope, canAccessApplication } from "@/lib/recruitment/scope";

type Role = "member" | "domain_admin" | "super_admin";
const login = (role: Role, domain: string) =>
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "u1", role, domain } } as never);

const ctx = { params: Promise.resolve({ id: "a1" }) };
const patch = (body: unknown) => new NextRequest("http://localhost/api/applications/a1", { method: "PATCH", body: JSON.stringify(body) });
const stored = (over = {}) => ({ id: "a1", reference: "AND-1", name: "Ann", email: "ann@x.com", domain: "web", status: "new", ...over });

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => vi.clearAllMocks());

describe("application scope", () => {
  it("gives super admins every domain and leads their own", () => {
    expect(applicationScope({ role: "super_admin", domain: "Web" })).toEqual({ kind: "all" });
    expect(applicationScope({ role: "domain_admin", domain: "Design" })).toEqual({ kind: "domain", domain: "design" });
    expect(applicationScope({ role: "domain_admin", domain: "PR" })).toEqual({ kind: "domain", domain: "pr" });
  });
  it("gives members nothing, and R&D leads no domain because the form has none", () => {
    expect(applicationScope({ role: "member", domain: "Web" })).toBeNull();
    expect(applicationScope({ role: "domain_admin", domain: "R&D" })).toEqual({ kind: "domain", domain: null });
  });
  it("only lets a lead touch their own domain", () => {
    expect(canAccessApplication({ kind: "domain", domain: "web" }, "web")).toBe(true);
    expect(canAccessApplication({ kind: "domain", domain: "web" }, "design")).toBe(false);
    expect(canAccessApplication({ kind: "domain", domain: null }, "web")).toBe(false);
    expect(canAccessApplication({ kind: "all" }, "media")).toBe(true);
  });
});

describe("GET /api/applications", () => {
  it("lets leads and super admins in, nobody else", async () => {
    login("member", "Web");
    vi.mocked(requireUser).mockImplementation(async (_req, roles) =>
      roles?.includes("member" as never) ? ({ ok: true } as never) : ({ ok: false, response: new Response(null, { status: 403 }) } as never));
    expect((await list(new NextRequest("http://localhost/api/applications"))).status).toBe(403);
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["domain_admin", "super_admin"]);
    expect(db.application.findMany).not.toHaveBeenCalled();
  });

  it("shows a lead only their own domain's applications", async () => {
    login("domain_admin", "Design");
    expect((await list(new NextRequest("http://localhost/api/applications"))).status).toBe(200);
    expect(db.application.findMany.mock.calls[0]?.[0]?.where).toEqual({ domain: "design" });
  });

  it("shows a super admin every domain", async () => {
    login("super_admin", "Web");
    await list(new NextRequest("http://localhost/api/applications"));
    expect(db.application.findMany.mock.calls[0]?.[0]?.where).toBeUndefined();
  });

  it("returns an empty list for an R&D lead without querying", async () => {
    login("domain_admin", "R&D");
    const body = await (await list(new NextRequest("http://localhost/api/applications"))).json();
    expect(body.applications).toEqual([]);
    expect(db.application.findMany).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/applications/[id]", () => {
  it("lets a lead accept an applicant to their domain and emails them", async () => {
    login("domain_admin", "Web");
    db.application.findUnique.mockResolvedValue(stored());
    db.application.update.mockResolvedValue(stored({ status: "accepted" }));
    const res = await decide(patch({ status: "accepted", notify: true }), ctx);
    expect(res.status).toBe(200);
    expect(db.application.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { status: "accepted" } });
    expect(sendDecision).toHaveBeenCalledTimes(1);
  });

  it("answers 404 when a lead tries an applicant from another domain, and changes nothing", async () => {
    login("domain_admin", "Design");
    db.application.findUnique.mockResolvedValue(stored({ domain: "web" }));
    expect((await decide(patch({ status: "rejected" }), ctx)).status).toBe(404);
    expect(db.application.update).not.toHaveBeenCalled();
    expect(sendDecision).not.toHaveBeenCalled();
  });

  it("lets a super admin decide any domain", async () => {
    login("super_admin", "Technical");
    db.application.findUnique.mockResolvedValue(stored({ domain: "media" }));
    db.application.update.mockResolvedValue(stored({ domain: "media", status: "rejected" }));
    expect((await decide(patch({ status: "rejected" }), ctx)).status).toBe(200);
  });

  it("rejects a status that does not exist", async () => {
    login("domain_admin", "Web");
    expect((await decide(patch({ status: "hired" }), ctx)).status).toBe(400);
  });
});
