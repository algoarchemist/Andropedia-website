import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ cookie: undefined as string | undefined }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "andropedia_session" && h.cookie ? { value: h.cookie } : undefined) }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { createSession, loginWithPassword, requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

const dbUser = (over = {}) => ({
  id: "u1", name: "Aarav", email: "aarav@college.edu", role: "MEMBER", domain: "WEB", avatar: null, bio: null, github: null,
  linkedin: null, portfolio: null, points: 0, tasksCompleted: 0, streakWeeks: 0, isActive: true, position: "MEMBER", ...over,
});
const session = (over = {}) => ({
  id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 3_600_000), lastUsedAt: new Date(), user: dbUser(), ...over,
});
const req = (method = "GET", headers: Record<string, string> = {}) => new NextRequest("http://localhost/api/x", { method, headers: { host: "localhost", ...headers } });

beforeEach(() => {
  h.cookie = undefined;
  vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.session.update).mockResolvedValue({} as never);
});
afterEach(() => vi.clearAllMocks());

describe("requireUser", () => {
  it("answers 401 when there is no session cookie", async () => {
    const r = await requireUser(req());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("answers 401 for a cookie that matches no session", async () => {
    h.cookie = "forged";
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null);
    const r = await requireUser(req());
    expect(!r.ok && r.response.status).toBe(401);
  });

  it("looks sessions up by the hash of the cookie, never the raw token", async () => {
    h.cookie = "tok";
    vi.mocked(prisma.session.findUnique).mockResolvedValue(session() as never);
    await requireUser(req());
    expect(vi.mocked(prisma.session.findUnique).mock.calls[0][0]).toMatchObject({ where: { tokenHash: sha256("tok") } });
  });

  it("rejects an expired session and deletes it", async () => {
    h.cookie = "tok";
    vi.mocked(prisma.session.findUnique).mockResolvedValue(session({ expiresAt: new Date(Date.now() - 1000) }) as never);
    const r = await requireUser(req());
    expect(!r.ok && r.response.status).toBe(401);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("rejects a deactivated user even with a live session", async () => {
    h.cookie = "tok";
    vi.mocked(prisma.session.findUnique).mockResolvedValue(session({ user: dbUser({ isActive: false }) }) as never);
    const r = await requireUser(req());
    expect(!r.ok && r.response.status).toBe(401);
  });

  it("answers 403 when the role is not allowed, and passes when it is", async () => {
    h.cookie = "tok";
    vi.mocked(prisma.session.findUnique).mockResolvedValue(session() as never);
    const denied = await requireUser(req(), ["super_admin"]);
    expect(!denied.ok && denied.response.status).toBe(403);
    const allowed = await requireUser(req(), ["member", "super_admin"]);
    expect(allowed.ok && allowed.user.id).toBe("u1");
  });

  it("refuses an account still on its default password everywhere except the password change", async () => {
    h.cookie = "tok";
    vi.mocked(prisma.session.findUnique).mockResolvedValue(session({ user: dbUser({ mustChangePassword: true }) }) as never);
    const blocked = await requireUser(req());
    expect(!blocked.ok && blocked.response.status).toBe(403);
    if (!blocked.ok) expect(await blocked.response.json()).toMatchObject({ code: "PASSWORD_CHANGE_REQUIRED" });
    const admin = await requireUser(req(), ["super_admin"]); // the role check never gets to run first
    expect(!admin.ok && admin.response.status).toBe(403);
    const allowed = await requireUser(req(), undefined, { allowPasswordChange: true });
    expect(allowed.ok && allowed.user.mustChangePassword).toBe(true);
  });

  it("lets an account that has chosen its own password through", async () => {
    h.cookie = "tok";
    vi.mocked(prisma.session.findUnique).mockResolvedValue(session({ user: dbUser({ mustChangePassword: false }) }) as never);
    expect((await requireUser(req())).ok).toBe(true);
  });

  it("blocks cross-site writes before touching the session", async () => {
    h.cookie = "tok";
    const r = await requireUser(req("POST", { origin: "https://evil.example" }));
    expect(!r.ok && r.response.status).toBe(403);
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });
});

describe("createSession", () => {
  it("stores only a hash of the token and signs out sessions beyond the limit", async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({} as never);
    vi.mocked(prisma.session.findMany).mockResolvedValue([{ id: "old1" }] as never);
    const { token } = await createSession("u1");
    expect(vi.mocked(prisma.session.create).mock.calls[0][0].data.tokenHash).toBe(sha256(token));
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old1"] } } });
  });
});

describe("loginWithPassword", () => {
  const stored = () => dbUser({ registerNo: "RA2511026020025", passwordHash: hashPassword("RA2511026020025") });

  beforeEach(() => {
    vi.mocked(prisma.session.create).mockResolvedValue({} as never);
    vi.mocked(prisma.session.findMany).mockResolvedValue([] as never);
  });

  it("logs in with the register number as both username and password, ignoring case and spaces", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(stored() as never);
    const result = await loginWithPassword(" ra2511026020025 ", "ra 2511026020025");
    expect(result?.user.id).toBe("u1");
    expect(result?.token).toBeTruthy();
    expect(vi.mocked(prisma.user.findUnique).mock.calls[0][0]).toEqual({ where: { registerNo: "RA2511026020025" } });
  });

  it("refuses a wrong password and creates no session", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(stored() as never);
    expect(await loginWithPassword("RA2511026020025", "RA2511026020026")).toBeNull();
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it("refuses an unknown register number", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    expect(await loginWithPassword("RA0000000000000", "RA0000000000000")).toBeNull();
  });

  it("refuses an account that has no password set", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(dbUser({ registerNo: "RA2511026020025", passwordHash: null }) as never);
    expect(await loginWithPassword("RA2511026020025", "RA2511026020025")).toBeNull();
  });

  it("refuses a deactivated member even with the right password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...stored(), isActive: false } as never);
    expect(await loginWithPassword("RA2511026020025", "RA2511026020025")).toBeNull();
  });
});
