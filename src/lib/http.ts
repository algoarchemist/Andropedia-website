import { NextResponse } from "next/server";

/**
 * The visitor's IP address, for rate limits. A browser can send any `X-Forwarded-For` it likes, so the first entry
 * is NOT trusted: each proxy in front of the app appends the address it saw, so the real client is the entry the
 * outermost trusted proxy added. `TRUSTED_PROXY_HOPS` (default 1) is how many proxies you run in front of the app.
 * Vercel sets its own header, which a visitor cannot forge, so that wins when present.
 */
export function clientIp(request: Request): string {
  const platform = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (platform) return platform;
  const hops = Math.max(1, Math.floor(Number(process.env.TRUSTED_PROXY_HOPS)) || 1);
  const chain = (request.headers.get("x-forwarded-for") ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  if (chain.length > 0) return chain[Math.max(0, chain.length - hops)];
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** One error shape for every API route: { success: false, error, fieldErrors? }. */
export function jsonError(
  error: string,
  status: number,
  opts: { fieldErrors?: Record<string, string[]>; headers?: Record<string, string> } = {}
) {
  return NextResponse.json(
    { success: false, error, ...(opts.fieldErrors ? { fieldErrors: opts.fieldErrors } : {}) },
    { status, headers: opts.headers }
  );
}

export type JsonBody = { ok: true; data: unknown } | { ok: false; response: NextResponse };

/**
 * Reads a request body, stopping as soon as it grows past `maxBytes` instead of buffering it all first (a body sent in
 * chunks has no Content-Length to check). Returns null when it is too large; throws if the body cannot be read.
 */
export async function readBodyLimited(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/** Reads a JSON body, refusing anything larger than `maxBytes` before parsing it. */
export async function readJson(request: Request, maxBytes = 32 * 1024): Promise<JsonBody> {
  let bytes: Uint8Array | null;
  try {
    bytes = await readBodyLimited(request, maxBytes);
  } catch {
    return { ok: false, response: jsonError("The request could not be read.", 400) };
  }
  if (!bytes) return { ok: false, response: jsonError("Request is too large.", 413) };
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, response: jsonError("The request body must be valid JSON.", 400) };
  }
}
