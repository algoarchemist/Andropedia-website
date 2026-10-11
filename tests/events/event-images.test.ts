import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn(), listAudit: vi.fn(async () => []) }));

const db = vi.hoisted(() => ({
  event: { findUnique: vi.fn(), findMany: vi.fn() },
  eventImage: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST as addImage } from "@/app/api/admin/events/[id]/images/route";
import { DELETE as deleteImage } from "@/app/api/admin/events/[id]/images/[imageId]/route";
import { GET as getImage } from "@/app/api/events/images/[imageId]/route";
import { listAdminEvents, listPublicEvents, MAX_EVENT_IMAGE_BYTES, MAX_EVENT_IMAGES } from "@/lib/events";
import { requireUser } from "@/lib/auth";

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const post = (body: BodyInit) => new NextRequest("http://localhost/api/admin/events/ev1/images", { method: "POST", body });
const ctx = { params: Promise.resolve({ id: "ev1" }) };
const imgCtx = { params: Promise.resolve({ id: "ev1", imageId: "img1" }) };

const eventRow = (over = {}) => ({
  id: "ev1", title: "Hack Night", type: "Hackathon", description: "A long night of building.", location: "Lab",
  startsAt: new Date("2026-12-01T10:00:00Z"), endsAt: null, capacity: null, teamMin: null, teamMax: null, prize: null,
  isPublished: true, registrationOpen: true, dateTbc: false, createdAt: new Date(), updatedAt: new Date(), _count: { rsvps: 0 }, ...over,
});

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "boss", role: "super_admin" } } as never);
});
afterEach(() => vi.clearAllMocks());

describe("uploading an event photo", () => {
  it("stores a valid image at the end of the gallery", async () => {
    db.event.findUnique.mockResolvedValue({ id: "ev1" });
    db.eventImage.count.mockResolvedValue(2);
    db.eventImage.create.mockResolvedValue({ id: "img9" });
    const res = await addImage(post(JPEG), ctx);
    expect(res.status).toBe(201);
    expect((await res.json()).photo).toEqual({ id: "img9", url: "/api/events/images/img9" });
    expect(db.eventImage.create.mock.calls[0][0].data).toMatchObject({ eventId: "ev1", mime: "image/jpeg", position: 2 });
  });

  it("refuses non-images, empty and oversized files", async () => {
    expect((await addImage(post(new TextEncoder().encode("<svg onload=alert(1)>")), ctx)).status).toBe(415);
    expect((await addImage(post(new Uint8Array()), ctx)).status).toBe(400);
    expect((await addImage(post(new Uint8Array(MAX_EVENT_IMAGE_BYTES + 1)), ctx)).status).toBe(413);
    expect(db.eventImage.create).not.toHaveBeenCalled();
  });

  it("stops at the photo limit and 404s for an unknown event", async () => {
    db.event.findUnique.mockResolvedValue({ id: "ev1" });
    db.eventImage.count.mockResolvedValue(MAX_EVENT_IMAGES);
    expect((await addImage(post(JPEG), ctx)).status).toBe(409);
    db.event.findUnique.mockResolvedValue(null);
    expect((await addImage(post(JPEG), ctx)).status).toBe(404);
  });
});

describe("deleting an event photo", () => {
  it("deletes only a photo that belongs to that event", async () => {
    db.eventImage.deleteMany.mockResolvedValue({ count: 1 });
    expect((await deleteImage(new NextRequest("http://localhost/x", { method: "DELETE" }), imgCtx)).status).toBe(200);
    expect(db.eventImage.deleteMany).toHaveBeenCalledWith({ where: { id: "img1", eventId: "ev1" } });
    db.eventImage.deleteMany.mockResolvedValue({ count: 0 });
    expect((await deleteImage(new NextRequest("http://localhost/x", { method: "DELETE" }), imgCtx)).status).toBe(404);
  });
});

describe("super admin only", () => {
  it.each([
    ["upload", () => addImage(post(JPEG), ctx)],
    ["delete", () => deleteImage(new NextRequest("http://localhost/x", { method: "DELETE" }), imgCtx)],
  ])("%s answers 403 and touches nothing", async (_name, call) => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await call()).status).toBe(403);
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["super_admin"]);
    for (const model of Object.values(db)) for (const fn of Object.values(model)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("serving photos", () => {
  it("serves a stored photo publicly with long-lived caching, and 404s when missing", async () => {
    db.eventImage.findUnique.mockResolvedValue({ mime: "image/jpeg", data: Buffer.from(JPEG) });
    const ok = await getImage(new Request("http://localhost/x"), { params: Promise.resolve({ imageId: "cm1abcdefghij12345" }) });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toMatch(/immutable/);
    expect(requireUser).not.toHaveBeenCalled();
    db.eventImage.findUnique.mockResolvedValue(null);
    expect((await getImage(new Request("http://localhost/x"), { params: Promise.resolve({ imageId: "cm1doesnotexist9999" }) })).status).toBe(404);
  });

  it("answers 404 for a malformed id without touching the database", async () => {
    db.eventImage.findUnique.mockClear();
    for (const bad of ["../../etc/passwd", "a", "x".repeat(80), "id with spaces"]) {
      expect((await getImage(new Request("http://localhost/x"), { params: Promise.resolve({ imageId: bad }) })).status).toBe(404);
    }
    expect(db.eventImage.findUnique).not.toHaveBeenCalled();
  });

  it("treats a missing table (migration not applied yet) as no photo, not a crash", async () => {
    db.eventImage.findUnique.mockRejectedValue(Object.assign(new Error("relation does not exist"), { code: "P2021" }));
    const res = await getImage(new Request("http://localhost/x"), { params: Promise.resolve({ imageId: "cm1abcdefghij12345" }) });
    expect(res.status).toBe(404);
  });

  it("still answers 500 for a real database failure", async () => {
    db.eventImage.findUnique.mockRejectedValue(new Error("connection reset"));
    const res = await getImage(new Request("http://localhost/x"), { params: Promise.resolve({ imageId: "cm1abcdefghij12345" }) });
    expect(res.status).toBe(500);
  });
});

describe("event listings carry the photos", () => {
  it("adds uploaded photos after the bundled ones, and exposes the deletable list only to admins", async () => {
    db.event.findMany.mockResolvedValue([eventRow({ id: "boot-camp" })]);
    db.eventImage.findMany.mockResolvedValue([{ id: "u1", eventId: "boot-camp" }]);
    const [pub] = await listPublicEvents();
    expect(pub.images.at(-1)).toBe("/api/events/images/u1");
    expect(pub.images.length).toBeGreaterThan(1);
    expect("photos" in pub).toBe(false);
    const [admin] = await listAdminEvents();
    expect(admin.photos).toEqual([{ id: "u1", url: "/api/events/images/u1" }]);
  });

  it("still lists events if the photo table cannot be read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    db.event.findMany.mockResolvedValue([eventRow()]);
    db.eventImage.findMany.mockRejectedValue(new Error('relation "EventImage" does not exist'));
    const [pub] = await listPublicEvents();
    expect(pub.images).toEqual([]);
  });
});
