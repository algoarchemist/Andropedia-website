import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

const db = vi.hoisted(() => {
  const client: Record<string, unknown> = {
    week: { findUnique: vi.fn() },
    taskPrompt: { findMany: vi.fn(async () => []), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    taskPromptFile: { upsert: vi.fn(), deleteMany: vi.fn() },
  };
  client.$transaction = (fn: (tx: unknown) => unknown) => fn(client);
  return client as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { DELETE as remove } from "@/app/api/prompts/[id]/route";
import { GET as getFile, PUT as putFile } from "@/app/api/prompts/[id]/file/route";
import { GET as list, POST as post } from "@/app/api/prompts/route";
import { requireUser } from "@/lib/auth";

const as = (role: string, domain = "Web") =>
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: "u1", role, domain } } as never);
const req = (method: string, body?: unknown, url = "http://localhost/api/prompts") =>
  new NextRequest(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "p1" }) };
const valid = { weekId: "w1", title: "Pricing page", description: "Build a responsive pricing page." };
const row = (domain: string) => ({
  id: "p1", weekId: "w1", domain, title: "T", description: "D", resourceUrl: null, dueDate: null, createdById: "u1",
  updatedAt: new Date(), week: { weekNumber: 4 },
});

afterEach(() => vi.clearAllMocks());

describe("POST /api/prompts", () => {
  it("is for leads only", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await post(req("POST", valid))).status).toBe(403);
    expect(vi.mocked(requireUser).mock.calls[0][1]).toEqual(["domain_admin", "super_admin"]);
    expect(db.taskPrompt.upsert).not.toHaveBeenCalled();
  });

  it("posts to the lead's own domain even if the body names another", async () => {
    as("domain_admin", "Web");
    db.week.findUnique.mockResolvedValue({ id: "w1" });
    db.taskPrompt.upsert.mockResolvedValue(row("WEB"));
    expect((await post(req("POST", { ...valid, domain: "Design" }))).status).toBe(200);
    expect(db.taskPrompt.upsert.mock.calls[0][0].create.domain).toBe("WEB");
  });

  it("lets a super admin pick the domain", async () => {
    as("super_admin", "Web");
    db.week.findUnique.mockResolvedValue({ id: "w1" });
    db.taskPrompt.upsert.mockResolvedValue(row("DESIGN"));
    expect((await post(req("POST", { ...valid, domain: "Design" }))).status).toBe(200);
    expect(db.taskPrompt.upsert.mock.calls[0][0].create.domain).toBe("DESIGN");
  });

  it("404s for an unknown week and 400s for bad input", async () => {
    as("domain_admin");
    db.week.findUnique.mockResolvedValue(null);
    expect((await post(req("POST", valid))).status).toBe(404);
    expect((await post(req("POST", { ...valid, title: "x" }))).status).toBe(400);
    expect((await post(req("POST", { ...valid, resourceUrl: "javascript:alert(1)" }))).status).toBe(400);
  });
});

describe("GET /api/prompts", () => {
  it("scopes members and leads to their own domain, ignoring the query", async () => {
    as("member", "Media");
    await list(req("GET", undefined, "http://localhost/api/prompts?domain=Web"));
    expect(db.taskPrompt.findMany.mock.calls[0][0].where.domain).toBe("MEDIA");
  });

  it("shows a super admin every domain unless one is asked for", async () => {
    as("super_admin");
    await list(req("GET"));
    expect(db.taskPrompt.findMany.mock.calls[0][0].where.domain).toBeUndefined();
    await list(req("GET", undefined, "http://localhost/api/prompts?domain=PR"));
    expect(db.taskPrompt.findMany.mock.calls[1][0].where.domain).toBe("PR");
  });
});

describe("DELETE /api/prompts/[id]", () => {
  it("won't let a lead remove another domain's task", async () => {
    as("domain_admin", "Web");
    db.taskPrompt.findUnique.mockResolvedValue({ id: "p1", domain: "DESIGN" });
    expect((await remove(req("DELETE"), ctx)).status).toBe(403);
    expect(db.taskPrompt.delete).not.toHaveBeenCalled();
  });

  it("removes the lead's own", async () => {
    as("domain_admin", "Web");
    db.taskPrompt.findUnique.mockResolvedValue({ id: "p1", domain: "WEB" });
    expect((await remove(req("DELETE"), ctx)).status).toBe(200);
    expect(db.taskPrompt.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

describe("/api/prompts/[id]/file", () => {
  const url = "http://localhost/api/prompts/p1/file?name=brief.pdf";
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 fake");
  const put = (body: BodyInit) => new NextRequest(url, { method: "PUT", body });

  it("rejects non-PDF content even if named .pdf", async () => {
    as("domain_admin", "Web");
    expect((await putFile(put("<html>not a pdf</html>"), ctx)).status).toBe(415);
    expect(db.taskPromptFile.upsert).not.toHaveBeenCalled();
  });

  it("rejects a PDF over 4 MB", async () => {
    as("domain_admin", "Web");
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(pdfBytes);
    expect((await putFile(put(big), ctx)).status).toBe(413);
  });

  it("stores a PDF for the lead's own domain", async () => {
    as("domain_admin", "Web");
    db.taskPrompt.findUnique.mockResolvedValue({ domain: "WEB" });
    db.taskPrompt.findUniqueOrThrow.mockResolvedValue({ ...row("WEB"), file: { name: "brief.pdf", size: pdfBytes.length } });
    const res = await putFile(put(pdfBytes), ctx);
    expect(res.status).toBe(200);
    expect(db.taskPromptFile.upsert.mock.calls[0][0].create).toMatchObject({ promptId: "p1", name: "brief.pdf", size: pdfBytes.length });
    expect((await res.json()).prompt.fileName).toBe("brief.pdf");
  });

  it("won't let a lead attach to another domain's task", async () => {
    as("domain_admin", "Web");
    db.taskPrompt.findUnique.mockResolvedValue({ domain: "DESIGN" });
    expect((await putFile(put(pdfBytes), ctx)).status).toBe(403);
    expect(db.taskPromptFile.upsert).not.toHaveBeenCalled();
  });

  it("serves the PDF to the same domain only", async () => {
    db.taskPrompt.findUnique.mockResolvedValue({ domain: "WEB", file: { name: "brief.pdf", data: pdfBytes } });
    as("member", "Web");
    const ok = await getFile(req("GET"), ctx);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toBe("application/pdf");
    as("member", "Media");
    expect((await getFile(req("GET"), ctx)).status).toBe(404);
    as("super_admin", "Media");
    expect((await getFile(req("GET"), ctx)).status).toBe(200);
  });
});
