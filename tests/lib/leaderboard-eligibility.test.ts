import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => {
  const client = {
    user: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
    evaluation: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
    week: { findFirst: vi.fn(async () => null) },
    loginDay: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
  };
  return client as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { getLeaderboard } from "@/lib/data-store";

afterEach(() => vi.clearAllMocks());

describe("who competes on the leaderboard", () => {
  it("is active members only: no co-leads, Chiefs, leads or super admins", async () => {
    await getLeaderboard();
    expect(db.user.findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
      role: "MEMBER",
      position: { notIn: ["CHIEF", "CO_LEAD"] },
    });
  });
});
