import { afterEach, describe, expect, it, vi } from "vitest";
import { appendApplication, colLetter, HEADERS, isTransient, safe, SheetsNotConfiguredError, toRow, withRetry } from "@/lib/recruitment/sheets";
import { ALL_QUESTION_IDS } from "@/lib/recruitment/questions";
import type { StoredApplication } from "@/lib/recruitment/schema";

const app: StoredApplication = {
  reference: "REC-ABCD1234", submittedAt: "2026-10-06T10:00:00.000Z", name: "Priya", registerNo: "RA2511026020025",
  department: "CSE AIML A", year: "second", phone: "9876543210", email: "priya@college.edu",
  profile: "https://github.com/priya", domain: "web",
  answers: { why_join: "Genuine passion for the craft", web_faction: "Full-Stack" }, consent: true,
};

describe("safe (spreadsheet formula injection)", () => {
  it.each(["=SUM(A1)", "+1", "-1", "@cmd"])("prefixes %s", (v) => expect(safe(v)).toBe(`'${v}`));
  it("leaves normal text alone", () => expect(safe("Priya K")).toBe("Priya K"));
});

describe("toRow", () => {
  it("has exactly one cell per header, in order", () => {
    const row = toRow(app, "pending");
    expect(row).toHaveLength(HEADERS.length);
    const at = (name: string) => row[HEADERS.indexOf(name as never)];
    expect(at("reference")).toBe("REC-ABCD1234");
    expect(at("register_no")).toBe("RA2511026020025");
    expect(at("domain")).toBe("web");
    expect(at("consent")).toBe("TRUE");
    expect(at("email_status")).toBe("pending");
    expect(HEADERS.at(-1)).toBe("email_status");
  });
  it("puts answers under their question column and leaves other domains' columns blank", () => {
    const row = toRow(app, "sent");
    const at = (id: string) => row[HEADERS.indexOf(id as never)];
    expect(at("why_join")).toBe("Genuine passion for the craft");
    expect(at("web_faction")).toBe("Full-Stack");
    expect(at("media_gear")).toBe("");
    expect(at("tech_github")).toBe("");
  });
  it("has one column for every question, with no duplicates", () => {
    for (const id of ALL_QUESTION_IDS) expect(HEADERS).toContain(id);
    expect(new Set(HEADERS).size).toBe(HEADERS.length);
  });
  it("neutralises formulas in free-text columns", () => {
    const row = toRow({ ...app, name: '=HYPERLINK("x")', phone: "+919876543210", answers: { web_center_div: "@x" } }, "sent");
    const at = (id: string) => row[HEADERS.indexOf(id as never)];
    expect(at("name").startsWith("'")).toBe(true);
    expect(at("phone").startsWith("'")).toBe(true);
    expect(at("web_center_div").startsWith("'")).toBe(true);
  });
});

describe("colLetter", () => {
  it.each([[0, "A"], [25, "Z"], [26, "AA"], [27, "AB"], [51, "AZ"], [52, "BA"]])("%i -> %s", (i, letter) => expect(colLetter(i)).toBe(letter));
});

describe("isTransient", () => {
  it("retries rate limits, timeouts and server errors", () => {
    expect(isTransient({ status: 429 })).toBe(true);
    expect(isTransient({ response: { status: 503 } })).toBe(true);
    expect(isTransient({ code: "ETIMEDOUT" })).toBe(true);
    expect(isTransient({ code: "ECONNRESET" })).toBe(true);
  });
  it("does not retry client errors or missing configuration", () => {
    expect(isTransient({ status: 400 })).toBe(false);
    expect(isTransient({ status: 403 })).toBe(false);
    expect(isTransient(new SheetsNotConfiguredError("x"))).toBe(false);
    expect(isTransient(new Error("boom"))).toBe(false);
  });
});

describe("withRetry", () => {
  const noSleep = { sleep: async () => undefined };

  it("returns after a transient failure succeeds", async () => {
    const fn = vi.fn().mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce("ok");
    await expect(withRetry(fn, noSleep)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("gives up after the attempt limit and rethrows", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 500 });
    await expect(withRetry(fn, { ...noSleep, attempts: 3 })).rejects.toEqual({ status: 500 });
    expect(fn).toHaveBeenCalledTimes(3);
  });
  it("does not retry permanent errors", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 403 });
    await expect(withRetry(fn, noSleep)).rejects.toBeDefined();
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("backs off exponentially", async () => {
    const sleep = vi.fn(async (ms: number) => void ms);
    const fn = vi.fn().mockRejectedValue({ status: 503 });
    await withRetry(fn, { attempts: 3, baseMs: 100, sleep }).catch(() => undefined);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([100, 200]);
  });
});

describe("appendApplication via the Apps Script web app", () => {
  const set = () => {
    process.env.RECRUITMENT_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/TEST/exec";
    process.env.RECRUITMENT_SHEET_WEBHOOK_SECRET = "s3cret";
  };
  afterEach(() => {
    delete process.env.RECRUITMENT_SHEET_WEBHOOK_URL;
    delete process.env.RECRUITMENT_SHEET_WEBHOOK_SECRET;
    vi.unstubAllGlobals();
  });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("posts the unescaped row with the secret and returns the row number", async () => {
    set();
    const fetchMock = vi.fn().mockResolvedValue(reply({ ok: true, row: 9 }));
    vi.stubGlobal("fetch", fetchMock);
    const row = await appendApplication({ ...app, name: "=cmd", phone: "+919876543210" }, "sent");
    expect(row).toBe(9);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://script.google.com/macros/s/TEST/exec");
    const sent = JSON.parse(init.body);
    expect(sent.secret).toBe("s3cret");
    expect(sent.action).toBe("append");
    expect(sent.row).toHaveLength(HEADERS.length);
    expect(sent.row[HEADERS.indexOf("name")]).toBe("=cmd"); // stored as plain text by the script
    expect(sent.row[HEADERS.indexOf("email_status")]).toBe("sent");
  });

  it("does not retry when the script rejects the request", async () => {
    set();
    const fetchMock = vi.fn().mockResolvedValue(reply({ ok: false, error: "unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(appendApplication(app, "pending")).rejects.toThrow(/unauthorized/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a server error and then succeeds", async () => {
    set();
    const fetchMock = vi.fn().mockResolvedValueOnce(reply({}, 503)).mockResolvedValueOnce(reply({ ok: true, row: 4 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    const p = appendApplication(app, "pending");
    await vi.runAllTimersAsync();
    expect(await p).toBe(4);
    vi.useRealTimers();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
