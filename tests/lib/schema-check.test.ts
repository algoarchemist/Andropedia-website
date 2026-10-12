import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { schemaProblems } from "@/lib/schema-check";

const ALL = ["User", "Session", "Event", "RateLimit", "MemberPhoto", "EventImage", "AttendanceSession", "AttendanceRecord"].map((table_name) => ({ table_name }));

beforeEach(() => {
  db.$queryRaw.mockReset();
});

describe("schemaProblems", () => {
  it("is empty when every table and column is there", async () => {
    db.$queryRaw.mockResolvedValueOnce(ALL).mockResolvedValueOnce([{ table_name: "User", column_name: "mustChangePassword" }]);
    expect(await schemaProblems()).toEqual([]);
  });
  it("names what is missing when migrations have not been applied", async () => {
    db.$queryRaw.mockResolvedValueOnce(ALL.filter((t) => !["MemberPhoto", "EventImage"].includes(t.table_name))).mockResolvedValueOnce([]);
    const [problem] = await schemaProblems();
    expect(problem).toMatch(/table MemberPhoto/);
    expect(problem).toMatch(/table EventImage/);
    expect(problem).toMatch(/column User.mustChangePassword/);
    expect(problem).toMatch(/npm run db:deploy/);
  });
  it("never throws when the database is unreachable", async () => {
    db.$queryRaw.mockImplementation(() => Promise.reject(new Error("connection refused")));
    expect(await schemaProblems()).toEqual([]);
  });
});
