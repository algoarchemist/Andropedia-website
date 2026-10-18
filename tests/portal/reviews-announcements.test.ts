import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/rate-limit-db", () => ({ rateLimit: vi.fn(async () => ({ limited: false })) }));

const db = vi.hoisted(() => {
  const client: Record<string, unknown> = {
  application: { findMany: vi.fn(async (_args?: unknown) => [] as unknown[]), findUnique: vi.fn() },
  applicationReview: { upsert: vi.fn(), deleteMany: vi.fn() },
  announcement: { findMany: vi.fn(async (_args?: unknown) => [] as unknown[]), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  announcementRead: { createMany: vi.fn() },
  user: { findMany: vi.fn(async () => [] as unknown[]), update: vi.fn() },
  };
  client.$transaction = (fn: (tx: unknown) => unknown) => fn(client);
  return client as {
    application: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
    applicationReview: { upsert: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
    announcement: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
    announcementRead: { createMany: ReturnType<typeof vi.fn> };
    user: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET as listApplications } from "@/app/api/applications/route";
import { PUT as review } from "@/app/api/applications/[id]/review/route";
import { GET as listAnnouncementsRoute, POST as postAnnouncement } from "@/app/api/announcements/route";
import { DELETE as removeAnnouncement } from "@/app/api/announcements/[id]/route";
import { PATCH as patchMe } from "@/app/api/me/route";
import { requireUser } from "@/lib/auth";
import { canDeleteAnnouncement, targetDomain } from "@/lib/announcements";

type Role = "member" | "domain_admin" | "super_admin";
const login = (role: Role, domain = "Web", id = "u1") =>
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id, role, domain } } as never);
const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "a1" }) };

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => vi.clearAllMocks());

describe("PUT /api/applications/[id]/review", () => {
  it("saves a lead's own rating and comment for an applicant to their domain", async () => {
    login("domain_admin", "Web", "lead1");
    db.application.findUnique.mockResolvedValue({ id: "a1", domain: "web" });
    db.applicationReview.upsert.mockResolvedValue({ rating: 8, comment: "Strong", updatedAt: new Date() });
    const res = await review(json("/x", "PUT", { rating: 8, comment: "Strong" }), ctx);
    expect(res.status).toBe(200);
    expect(db.applicationReview.upsert.mock.calls[0][0].where).toEqual({ applicationId_reviewerId: { applicationId: "a1", reviewerId: "lead1" } });
  });

  it("answers 404 for another domain's applicant and saves nothing", async () => {
    login("domain_admin", "Design");
    db.application.findUnique.mockResolvedValue({ id: "a1", domain: "web" });
    expect((await review(json("/x", "PUT", { rating: 5 }), ctx)).status).toBe(404);
    expect(db.applicationReview.upsert).not.toHaveBeenCalled();
  });

  it("rejects a rating outside 1 to 10", async () => {
    login("domain_admin", "Web");
    for (const rating of [0, 11, 7.5]) expect((await review(json("/x", "PUT", { rating }), ctx)).status).toBe(400);
    expect(db.applicationReview.upsert).not.toHaveBeenCalled();
  });

  it("removes the review when both rating and comment are cleared", async () => {
    login("domain_admin", "Web", "lead1");
    db.application.findUnique.mockResolvedValue({ id: "a1", domain: "web" });
    const res = await review(json("/x", "PUT", { rating: null, comment: "  " }), ctx);
    expect((await res.json()).review).toBeNull();
    expect(db.applicationReview.deleteMany).toHaveBeenCalledWith({ where: { applicationId: "a1", reviewerId: "lead1" } });
  });
});

describe("GET /api/applications keeps notes private", () => {
  const row = {
    id: "a1", domain: "web", name: "Ann",
    reviews: [
      { reviewerId: "lead1", rating: 9, comment: "mine" },
      { reviewerId: "lead2", rating: 4, comment: "theirs" },
    ],
  };

  it("gives a lead only their own review", async () => {
    login("domain_admin", "Web", "lead1");
    db.application.findMany.mockResolvedValue([row]);
    const [app] = (await (await listApplications(json("/x", "GET"))).json()).applications;
    expect(app.myReview).toEqual({ rating: 9, comment: "mine" });
    expect(app.otherReviews).toEqual([]);
    expect(app.reviews).toBeUndefined();
  });

  it("gives a super admin everyone else's notes with the reviewer's name", async () => {
    login("super_admin", "Web", "boss");
    db.application.findMany.mockResolvedValue([row]);
    db.user.findMany.mockResolvedValue([{ id: "lead1", name: "Lead One" }, { id: "lead2", name: "Lead Two" }]);
    const [app] = (await (await listApplications(json("/x", "GET"))).json()).applications;
    expect(app.myReview).toBeNull();
    expect(app.otherReviews).toHaveLength(2);
    expect(app.otherReviews[1]).toEqual({ reviewer: "Lead Two", rating: 4, comment: "theirs" });
  });
});

describe("announcement rules", () => {
  it("sends a lead's message to their own domain or everyone, never another domain", () => {
    expect(targetDomain({ id: "1", role: "domain_admin", domain: "Web" }, "Design")).toBe("Web");
    expect(targetDomain({ id: "1", role: "domain_admin", domain: "Web" }, undefined)).toBe("Web");
    expect(targetDomain({ id: "1", role: "domain_admin", domain: "Web" }, "Web")).toBe("Web");
    expect(targetDomain({ id: "1", role: "domain_admin", domain: "Web" }, "All")).toBe("All");
  });
  it("lets a super admin pick any domain or everyone", () => {
    expect(targetDomain({ id: "1", role: "super_admin", domain: "Web" }, "All")).toBe("All");
    expect(targetDomain({ id: "1", role: "super_admin", domain: "Web" }, "PR")).toBe("PR");
    expect(targetDomain({ id: "1", role: "super_admin", domain: "Web" }, undefined)).toBe("Web");
  });
  it("lets a lead remove only their own domain's messages", () => {
    const lead = { id: "1", role: "domain_admin" as const, domain: "Web" as const };
    expect(canDeleteAnnouncement(lead, "Web")).toBe(true);
    expect(canDeleteAnnouncement(lead, "Design")).toBe(false);
    expect(canDeleteAnnouncement(lead, "All")).toBe(false);
    expect(canDeleteAnnouncement({ ...lead, role: "super_admin" }, "All")).toBe(true);
  });
  it("lets a lead remove an everyone-message only if they wrote it", () => {
    const lead = { id: "1", role: "domain_admin" as const, domain: "Web" as const };
    expect(canDeleteAnnouncement(lead, "All", "1")).toBe(true);
    expect(canDeleteAnnouncement(lead, "All", "2")).toBe(false);
  });
});

describe("announcement routes", () => {
  it("lets a lead post, forced to their own domain", async () => {
    login("domain_admin", "Web", "lead1");
    db.announcement.create.mockResolvedValue({ id: "n1" });
    const res = await postAnnouncement(json("/x", "POST", { title: "Deadline moved", body: "Now Sunday night.", domain: "Design" }));
    expect(res.status).toBe(201);
    expect(db.announcement.create.mock.calls[0][0].data).toMatchObject({ domain: "WEB", authorId: "lead1" });
  });

  it("lets a lead post to everyone", async () => {
    login("domain_admin", "Web", "lead1");
    db.announcement.create.mockResolvedValue({ id: "n1" });
    const res = await postAnnouncement(json("/x", "POST", { title: "Club meeting", body: "Friday 5pm.", domain: "All" }));
    expect(res.status).toBe(201);
    expect(db.announcement.create.mock.calls[0][0].data).toMatchObject({ domain: null, authorId: "lead1" });
  });

  it("lets a lead remove their own everyone-message", async () => {
    login("domain_admin", "Web", "lead1");
    db.announcement.findUnique.mockResolvedValue({ id: "n1", domain: null, authorId: "lead1" });
    expect((await removeAnnouncement(json("/x", "DELETE"), { params: Promise.resolve({ id: "n1" }) })).status).toBe(200);
    expect(db.announcement.delete).toHaveBeenCalled();
  });

  it("lets a super admin post to everyone", async () => {
    login("super_admin", "Web", "boss");
    db.announcement.create.mockResolvedValue({ id: "n1" });
    await postAnnouncement(json("/x", "POST", { title: "Club meeting", body: "Friday 5pm.", domain: "All" }));
    expect(db.announcement.create.mock.calls[0][0].data.domain).toBeNull();
  });

  it("rejects an empty title or message", async () => {
    login("domain_admin", "Web");
    expect((await postAnnouncement(json("/x", "POST", { title: "", body: "hello there" }))).status).toBe(400);
    expect((await postAnnouncement(json("/x", "POST", { title: "Hello", body: "" }))).status).toBe(400);
    expect(db.announcement.create).not.toHaveBeenCalled();
  });

  it("shows a member their own domain's messages and the ones for everyone, with new ones flagged", async () => {
    login("member", "Web", "m1");
    db.announcement.findMany.mockResolvedValue([
      { id: "n1", domain: "WEB", title: "T", body: "B", authorId: "lead1", createdAt: new Date(), reads: [] },
      { id: "n2", domain: null, title: "T2", body: "B2", authorId: "lead1", createdAt: new Date(), reads: [{ userId: "m1" }] },
    ]);
    db.user.findMany.mockResolvedValue([{ id: "lead1", name: "Lead One" }]);
    const body = await (await listAnnouncementsRoute(json("/x", "GET"))).json();
    expect(db.announcement.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { OR: [{ domain: null }, { domain: "WEB" }] } });
    expect(body.announcements.map((a: { isNew: boolean }) => a.isNew)).toEqual([true, false]);
    expect(body.announcements[1].domain).toBe("All");
    expect(body.announcements.every((a: { canDelete: boolean }) => a.canDelete === false)).toBe(true);
  });

  it("won't let a lead remove another domain's message", async () => {
    login("domain_admin", "Design");
    db.announcement.findUnique.mockResolvedValue({ id: "n1", domain: "WEB" });
    expect((await removeAnnouncement(json("/x", "DELETE"), { params: Promise.resolve({ id: "n1" }) })).status).toBe(403);
    expect(db.announcement.delete).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/me profile links", () => {
  beforeEach(() => db.user.update.mockResolvedValue({ id: "u1", role: "MEMBER", domain: "WEB", position: "MEMBER" }));

  it("cleans each link and clears an empty one", async () => {
    login("member");
    const res = await patchMe(json("/api/me", "PATCH", { linkedin: "www.linkedin.com/in/ann/", github: "@ann-dev", instagram: "" }));
    expect(res.status).toBe(200);
    expect(db.user.update.mock.calls[0][0].data).toEqual({ linkedin: "https://www.linkedin.com/in/ann", github: "https://github.com/ann-dev", instagram: null });
  });

  it("rejects a link that is not a profile on that site", async () => {
    login("member");
    expect((await patchMe(json("/api/me", "PATCH", { github: "https://evil.com/ann" }))).status).toBe(400);
    expect((await patchMe(json("/api/me", "PATCH", { instagram: "https://github.com/ann" }))).status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rejects an empty request", async () => {
    login("member");
    expect((await patchMe(json("/api/me", "PATCH", {}))).status).toBe(400);
  });
});
