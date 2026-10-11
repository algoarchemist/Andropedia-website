import { describe, expect, it } from "vitest";
import { afterEach, vi } from "vitest";
import { clientIp, jsonError, readBodyLimited, readJson } from "@/lib/http";

const req = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/x", { method: "POST", body, headers });

describe("readJson", () => {
  it("parses a valid body", async () => {
    const r = await readJson(req('{"a":1}'));
    expect(r).toEqual({ ok: true, data: { a: 1 } });
  });
  it("rejects invalid JSON with 400", async () => {
    const r = await readJson(req("{nope"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });
  it("rejects an oversized body with 413 (declared and actual)", async () => {
    const big = JSON.stringify({ x: "y".repeat(200) });
    const declared = await readJson(req(big, { "content-length": String(big.length) }), 50);
    const actual = await readJson(req(big), 50);
    for (const r of [declared, actual]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(413);
    }
  });
});

describe("clientIp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ignores what the visitor put at the front of x-forwarded-for and uses the entry the proxy added", () => {
    // a forged "6.6.6.6" at the front must not decide the rate-limit key
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "6.6.6.6, 1.2.3.4" } }))).toBe("1.2.3.4");
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4" } }))).toBe("1.2.3.4");
  });
  it("counts TRUSTED_PROXY_HOPS proxies in from the right", () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "6.6.6.6, 1.2.3.4, 10.0.0.1" } }))).toBe("1.2.3.4");
  });
  it("prefers the platform header, then x-real-ip", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-vercel-forwarded-for": "7.7.7.7", "x-forwarded-for": "6.6.6.6" } }))).toBe("7.7.7.7");
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("readBodyLimited", () => {
  it("returns the bytes of a body within the limit", async () => {
    const bytes = await readBodyLimited(req("hello"), 10);
    expect(new TextDecoder().decode(bytes!)).toBe("hello");
  });
  it("stops reading and returns null once the body grows past the limit, even without a Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 5; i++) controller.enqueue(new Uint8Array(10));
        controller.close();
      },
    });
    const chunked = new Request("http://x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await readBodyLimited(chunked, 25)).toBeNull();
  });
  it("refuses early on a declared size over the limit", async () => {
    expect(await readBodyLimited(req("x", { "content-length": "999" }), 10)).toBeNull();
  });
});

describe("jsonError", () => {
  it("uses one consistent shape", async () => {
    const res = jsonError("Nope", 400, { fieldErrors: { email: ["bad"] }, headers: { "Retry-After": "5" } });
    expect(res.status).toBe(400);
    expect(res.headers.get("Retry-After")).toBe("5");
    expect(await res.json()).toEqual({ success: false, error: "Nope", fieldErrors: { email: ["bad"] } });
  });
});
