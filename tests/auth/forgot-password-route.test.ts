import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ pending: [] as Array<() => unknown>, user: null as unknown, send: vi.fn() }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void h.pending.push(fn) }; // held back until settle(), like real after()
});
vi.mock("@/lib/auth", () => ({ isSameOrigin: vi.fn(() => true) }));
vi.mock("@/lib/mailer", () => ({ isMailConfigured: () => true }));
vi.mock("@/lib/password-reset", () => ({ sendPasswordReset: h.send }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn(async () => h.user) } } }));

import { POST } from "@/app/api/auth/forgot-password/route";
import { resetRateLimits } from "@/lib/recruitment/rate-limit";

let n = 0;
const post = (registerNo = "RA2511026020025") =>
  POST(new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ registerNo }),
    headers: { "content-type": "application/json", "x-forwarded-for": `10.5.0.${++n}` },
  }));
const settle = () => Promise.all(h.pending.splice(0).map((fn) => fn()));

beforeEach(() => {
  resetRateLimits();
  h.send.mockReset();
  h.pending.length = 0;
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("POST /api/auth/forgot-password", () => {
  it("answers the same for a member and for a stranger", async () => {
    h.user = { id: "u1", name: "A", email: "a@x.org", isActive: true };
    const member = await post();
    h.user = null;
    const stranger = await post("RA0000000000000");
    expect(member.status).toBe(200);
    expect(await member.json()).toEqual(await stranger.json());
  });

  it("sends the reset only AFTER answering (so response time doesn't reveal members)", async () => {
    h.user = { id: "u1", name: "A", email: "a@x.org", isActive: true };
    h.send.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const started = Date.now();
    await post();
    expect(Date.now() - started).toBeLessThan(40); // did not wait for the 50 ms send
    expect(h.send).not.toHaveBeenCalled();
    await settle();
    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it("never sends for an unknown or inactive account", async () => {
    h.user = null;
    await post();
    h.user = { id: "u2", name: "B", email: "b@x.org", isActive: false };
    await post();
    await settle();
    expect(h.send).not.toHaveBeenCalled();
  });
});
