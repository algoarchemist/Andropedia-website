import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ afterTasks: [] as Array<Promise<unknown>> }));

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void h.afterTasks.push(Promise.resolve().then(fn)) };
});
vi.mock("@/lib/graded-email", () => ({ sendGradedNotice: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

// The database: a transaction runs its callback against the same fake client.
const db = vi.hoisted(() => {
  const client: Record<string, unknown> = {
    user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    task: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
    week: { findUnique: vi.fn() },
    taskPrompt: { findUnique: vi.fn() },
    evaluation: { upsert: vi.fn() },
  };
  client.$transaction = (fn: (tx: unknown) => unknown) => fn(client);
  return client as {
    user: Record<string, ReturnType<typeof vi.fn>>;
    task: Record<string, ReturnType<typeof vi.fn>>;
    week: Record<string, ReturnType<typeof vi.fn>>;
    taskPrompt: Record<string, ReturnType<typeof vi.fn>>;
    evaluation: Record<string, ReturnType<typeof vi.fn>>;
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST as grade } from "@/app/api/evaluations/route";
import { GET as listTasks, POST as submit } from "@/app/api/tasks/route";
import { DELETE as deleteTask } from "@/app/api/tasks/[id]/route";
import { requireUser } from "@/lib/auth";
import { sendGradedNotice } from "@/lib/graded-email";

type Role = "member" | "domain_admin" | "super_admin";
const login = (role: Role, domain = "Web", id = "u1") =>
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id, role, domain } } as never);

const savedTask = (over = {}) => ({
  id: "t1", userId: "m1", weekId: "w1", domain: "WEB", title: "Realtime board", description: "A live scoreboard", githubUrl: null,
  liveUrl: null, figmaUrl: null, notes: null, status: "SUBMITTED", submittedAt: new Date(), updatedAt: new Date(),
  user: { id: "m1", name: "Member", avatar: null }, week: { id: "w1", weekNumber: 4, title: "Sprint 4" }, evaluation: null, ...over,
});

const post = (url: string, body: unknown) => new NextRequest(`http://localhost${url}`, { method: "POST", body: JSON.stringify(body) });
const get = (url: string) => new NextRequest(`http://localhost${url}`);

beforeEach(() => {
  h.afterTasks.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.clearAllMocks());

describe("GET /api/tasks scoping", () => {
  beforeEach(() => db.task.findMany.mockResolvedValue([]));
  const whereUsed = () => db.task.findMany.mock.calls[0][0].where;

  it("shows a member only their own tasks, whatever userId they ask for", async () => {
    login("member", "Web", "m1");
    await listTasks(get("/api/tasks?userId=someone-else&domain=Design"));
    expect(whereUsed()).toMatchObject({ userId: "m1" });
  });

  it("shows a domain lead only their own domain", async () => {
    login("domain_admin", "Web");
    await listTasks(get("/api/tasks?domain=Design"));
    expect(whereUsed()).toMatchObject({ domain: "WEB" });
  });

  it("lets a super admin filter freely", async () => {
    login("super_admin");
    await listTasks(get("/api/tasks?domain=Design"));
    expect(whereUsed()).toMatchObject({ domain: "DESIGN" });
  });

  it("rejects an unknown status filter", async () => {
    login("super_admin");
    expect((await listTasks(get("/api/tasks?status=hacked"))).status).toBe(400);
  });
});

describe("POST /api/tasks", () => {
  const body = { weekId: "w1", title: "Realtime board", description: "A live scoreboard for the sprint" };
  beforeEach(() => db.taskPrompt.findUnique.mockResolvedValue({ id: "p1" })); // the lead has posted this week's task

  it("is for members only: leads, co-leads and super admins do not submit", async () => {
    login("member", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.week.findUnique.mockResolvedValue({ isActive: true });
    db.task.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue(savedTask());
    await submit(post("/api/tasks", body));
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["member"]);
  });

  it("takes the author and domain from the session, never the request body", async () => {
    login("member", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.week.findUnique.mockResolvedValue({ isActive: true });
    db.task.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue(savedTask());
    const res = await submit(post("/api/tasks", { ...body, userId: "victim", domain: "Design" }));
    expect(res.status).toBe(201);
    expect(db.task.create.mock.calls[0][0].data).toMatchObject({ userId: "m1", domain: "WEB" });
  });

  it("refuses with 409 when the lead has not posted (or has removed) the week's task", async () => {
    login("member", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.week.findUnique.mockResolvedValue({ isActive: true });
    db.task.findUnique.mockResolvedValue(null);
    db.taskPrompt.findUnique.mockResolvedValue(null);
    const res = await submit(post("/api/tasks", body));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/hasn't posted a task/);
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("refuses a closed week with 409", async () => {
    login("member", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.week.findUnique.mockResolvedValue({ isActive: false });
    db.task.findUnique.mockResolvedValue(null);
    expect((await submit(post("/api/tasks", body))).status).toBe(409);
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("edits the existing submission instead of creating a second one", async () => {
    login("member", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.week.findUnique.mockResolvedValue({ isActive: true });
    db.task.findUnique.mockResolvedValue({ id: "t1", status: "SUBMITTED" });
    db.task.update.mockResolvedValue(savedTask());
    const res = await submit(post("/api/tasks", body));
    expect(res.status).toBe(200);
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("locks a graded submission", async () => {
    login("member", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.week.findUnique.mockResolvedValue({ isActive: true });
    db.task.findUnique.mockResolvedValue({ id: "t1", status: "EVALUATED" });
    expect((await submit(post("/api/tasks", body))).status).toBe(409);
  });

  it("stores a Google Drive link", async () => {
    login("member", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.week.findUnique.mockResolvedValue({ isActive: true });
    db.task.findUnique.mockResolvedValue(null);
    db.task.create.mockResolvedValue(savedTask());
    const driveUrl = "https://drive.google.com/drive/folders/abc123?usp=sharing";
    expect((await submit(post("/api/tasks", { ...body, driveUrl }))).status).toBe(201);
    expect(db.task.create.mock.calls[0][0].data).toMatchObject({ driveUrl });
  });

  it("rejects a Drive link that points anywhere else", async () => {
    login("member", "Web", "m1");
    for (const driveUrl of ["https://evil.example/drive.google.com", "http://drive.google.com/file/d/1", "https://drive.google.com.evil.example/x", "not a link"]) {
      expect((await submit(post("/api/tasks", { ...body, driveUrl }))).status).toBe(400);
    }
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("rejects a non-http link", async () => {
    login("member", "Web", "m1");
    expect((await submit(post("/api/tasks", { ...body, githubUrl: "javascript:alert(1)" }))).status).toBe(400);
  });
});

describe("POST /api/evaluations", () => {
  const rubric = { technicalDepth: 20, innovation: 20, completion: 20, documentation: 20 };
  const body = { taskId: "t1", score: 80, feedback: "Solid work", criteriaScores: rubric };

  beforeEach(() => {
    db.user.findUnique.mockResolvedValue({ id: "lead1" });
    db.evaluation.upsert.mockResolvedValue({});
    db.task.update.mockResolvedValue({});
    db.user.update.mockResolvedValue({});
    db.task.findUniqueOrThrow.mockResolvedValue(savedTask({ status: "EVALUATED" }));
  });

  it("is refused for plain members", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await grade(post("/api/evaluations", body))).status).toBe(403);
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["domain_admin", "super_admin"]);
  });

  it("requires the four rubric scores to add up to the score", async () => {
    login("domain_admin", "Web", "lead1");
    const res = await grade(post("/api/evaluations", { ...body, score: 90 }));
    expect(res.status).toBe(400);
    expect(db.evaluation.upsert).not.toHaveBeenCalled();
  });

  it("stops a lead grading another domain", async () => {
    login("domain_admin", "Design", "lead1");
    db.task.findUnique.mockResolvedValue(savedTask({ domain: "WEB" }));
    expect((await grade(post("/api/evaluations", body))).status).toBe(403);
    expect(db.evaluation.upsert).not.toHaveBeenCalled();
  });

  it("stops anyone grading their own submission", async () => {
    login("super_admin", "Web", "m1");
    db.user.findUnique.mockResolvedValue({ id: "m1" });
    db.task.findUnique.mockResolvedValue(savedTask({ userId: "m1" }));
    expect((await grade(post("/api/evaluations", body))).status).toBe(403);
  });

  it("awards the points once and counts the task as completed", async () => {
    login("domain_admin", "Web", "lead1");
    db.task.findUnique.mockResolvedValue(savedTask({ evaluation: null }));
    expect((await grade(post("/api/evaluations", body))).status).toBe(200);
    expect(db.user.update.mock.calls[0][0].data).toEqual({ points: { increment: 80 }, tasksCompleted: { increment: 1 } });
  });

  it("re-grading adjusts points by the difference and does not count the task twice", async () => {
    login("domain_admin", "Web", "lead1");
    db.task.findUnique.mockResolvedValue(savedTask({ status: "EVALUATED", evaluation: { score: 70 } }));
    expect((await grade(post("/api/evaluations", body))).status).toBe(200);
    expect(db.user.update.mock.calls[0][0].data).toEqual({ points: { increment: 10 } });
  });

  it("emails the member their score after grading, and a mail failure does not undo the grade", async () => {
    login("domain_admin", "Web", "lead1");
    db.task.findUnique.mockResolvedValue(savedTask({ evaluation: null }));
    db.user.findUnique.mockResolvedValue({ id: "lead1", name: "Member", email: "m@college.edu" });
    vi.mocked(sendGradedNotice).mockRejectedValue(new Error("smtp down"));
    const res = await grade(post("/api/evaluations", body));
    await Promise.all(h.afterTasks.splice(0));
    expect(res.status).toBe(200);
    expect(sendGradedNotice).toHaveBeenCalledWith(expect.objectContaining({ email: "m@college.edu" }), expect.anything(), { score: 80, feedback: "Solid work" });
  });

  it("returns 404 for an unknown task", async () => {
    login("super_admin", "Web", "lead1");
    db.task.findUnique.mockResolvedValue(null);
    expect((await grade(post("/api/evaluations", body))).status).toBe(404);
  });
});

describe("DELETE /api/tasks/[id]", () => {
  const ctx = { params: Promise.resolve({ id: "t1" }) };
  const del = () => deleteTask(new NextRequest("http://localhost/api/tasks/t1", { method: "DELETE" }), ctx);
  const stored = (over = {}) => ({
    userId: "m1", weekId: "w1", domain: "WEB", status: "SUBMITTED", week: { isActive: true }, evaluation: null, ...over,
  });

  it("lets a member delete their own ungraded submission", async () => {
    login("member", "Web", "m1");
    db.task.findUnique.mockResolvedValue(stored());
    expect((await del()).status).toBe(200);
    expect(db.task.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("refuses a member deleting someone else's submission", async () => {
    login("member", "Web", "m2");
    db.task.findUnique.mockResolvedValue(stored());
    expect((await del()).status).toBe(403);
    expect(db.task.delete).not.toHaveBeenCalled();
  });

  it("refuses a member deleting graded work", async () => {
    login("member", "Web", "m1");
    db.task.findUnique.mockResolvedValue(stored({ status: "EVALUATED", evaluation: { score: 80 } }));
    expect((await del()).status).toBe(409);
    expect(db.task.delete).not.toHaveBeenCalled();
  });

  it("lets a lead delete graded work in their domain and takes the points back", async () => {
    login("domain_admin", "Web", "lead1");
    db.task.findUnique.mockResolvedValue(stored({ status: "EVALUATED", evaluation: { score: 80 } }));
    expect((await del()).status).toBe(200);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { points: { decrement: 80 }, tasksCompleted: { decrement: 1 } },
    });
  });

  it("stops a lead deleting another domain's submission", async () => {
    login("domain_admin", "Design", "lead1");
    db.task.findUnique.mockResolvedValue(stored());
    expect((await del()).status).toBe(403);
  });

  it("answers 404 for a submission that is gone", async () => {
    login("super_admin");
    db.task.findUnique.mockResolvedValue(null);
    expect((await del()).status).toBe(404);
  });
});
