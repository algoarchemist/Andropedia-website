import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/recruitment/decision", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/recruitment/decision")>();
  return { ...actual, sendDecision: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: { application: { findUnique: vi.fn(), update: vi.fn() } } }));

import { PATCH } from "@/app/api/applications/[id]/route";
import { POST as lookup } from "@/app/api/recruitment/lookup/route";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDecision } from "@/lib/recruitment/decision";
import { resetRateLimits } from "@/lib/recruitment/rate-limit";

const admin = { id: "u1", role: "super_admin", domain: "Web" };
const app = { id: "a1", reference: "REC-AAAA1111", name: "Priya", email: "priya@college.edu", status: "new" };

const patch = (body: unknown) =>
  PATCH(new NextRequest("http://localhost/api/applications/a1", { method: "PATCH", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: "a1" }),
  });
const find = (body: unknown, ip = "1.1.1.1") =>
  lookup(new NextRequest("http://localhost/api/recruitment/lookup", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": ip } }));

beforeEach(() => {
  resetRateLimits();
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: admin } as never);
  vi.mocked(prisma.application.findUnique).mockResolvedValue(app as never);
  vi.mocked(prisma.application.update).mockImplementation((async ({ data }: { data: object }) => ({ ...app, ...data })) as never);
  vi.mocked(sendDecision).mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.clearAllMocks());

describe("PATCH /api/applications/[id]", () => {
  it("is refused for anyone who is not a super admin", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await patch({ status: "accepted" })).status).toBe(403);
    expect(prisma.application.update).not.toHaveBeenCalled();
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["domain_admin", "super_admin"]);
  });

  it("changes the status, emails the applicant when asked, and records an audit entry", async () => {
    const res = await patch({ status: "shortlisted", notify: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, emailed: true });
    expect(prisma.application.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { status: "shortlisted" } });
    expect(sendDecision).toHaveBeenCalledWith(expect.objectContaining({ email: "priya@college.edu" }), "shortlisted");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "application.status", meta: expect.objectContaining({ from: "new", to: "shortlisted", emailed: true }) })
    );
  });

  it("does not email again when the status did not change", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue({ ...app, status: "accepted" } as never);
    const json = await (await patch({ status: "accepted", notify: true })).json();
    expect(sendDecision).not.toHaveBeenCalled();
    expect(json.emailed).toBeNull();
  });

  it("sends no email unless notify is set", async () => {
    await patch({ status: "rejected" });
    expect(sendDecision).not.toHaveBeenCalled();
  });

  it("keeps the status change and reports emailed:false when the email fails", async () => {
    vi.mocked(sendDecision).mockRejectedValue(new Error("smtp down"));
    expect(await (await patch({ status: "accepted", notify: true })).json()).toMatchObject({ success: true, emailed: false });
  });

  it("rejects unknown statuses and a notification for 'new'", async () => {
    expect((await patch({ status: "maybe" })).status).toBe(400);
    expect((await patch({ status: "new", notify: true })).status).toBe(400);
  });

  it("returns 404 for an unknown application", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null);
    expect((await patch({ status: "accepted" })).status).toBe(404);
  });
});

describe("POST /api/recruitment/lookup", () => {
  const stored = { emailKey: "priya@college.edu", status: "shortlisted", domain: "web", createdAt: new Date("2026-10-06T10:00:00Z") };

  it("returns the status for a matching reference and email", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(stored as never);
    const res = await find({ reference: "rec-aaaa1111", email: "Priya@College.edu" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, status: "shortlisted" });
    expect(vi.mocked(prisma.application.findUnique).mock.calls[0][0]).toMatchObject({ where: { reference: "REC-AAAA1111" } });
  });

  it("answers every status warmly, and a non-selection still says so clearly", async () => {
    for (const status of ["new", "shortlisted", "accepted", "rejected"]) {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({ ...stored, status } as never);
      const { message } = await (await find({ reference: "REC-AAAA1111", email: "priya@college.edu" })).json();
      expect(message).toMatch(/thank|congratulations|great news/i);
      expect(message).not.toMatch(/^not selected/i);
      if (status === "rejected") expect(message).toMatch(/weren't able to offer you a place/i);
    }
  });

  it("gives the same answer for a wrong email and an unknown reference", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValueOnce(stored as never).mockResolvedValueOnce(null);
    const wrongEmail = await find({ reference: "REC-AAAA1111", email: "someone@else.edu" });
    const unknown = await find({ reference: "REC-ZZZZ9999", email: "priya@college.edu" });
    expect(wrongEmail.status).toBe(404);
    expect(await wrongEmail.json()).toEqual(await unknown.json());
  });

  it("rate-limits repeated guesses from one address", async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null);
    for (let i = 0; i < 10; i++) await find({ reference: "REC-AAAA1111", email: "a@b.edu" }, "9.9.9.9");
    const res = await find({ reference: "REC-AAAA1111", email: "a@b.edu" }, "9.9.9.9");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
