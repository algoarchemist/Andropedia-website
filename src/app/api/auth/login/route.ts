import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin, loginWithPassword, setSessionCookie } from "@/lib/auth";
import { normalizeRegisterNo } from "@/lib/password";
import { clientIp, jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { peekLimit, rateLimit } from "@/lib/rate-limit-db";

const bodySchema = z.object({ registerNo: z.string().trim().min(4).max(30), password: z.string().min(1).max(60) });

const HOUR = 60 * 60 * 1000;
const KNOWN_DEVICE_MS = 30 * 24 * HOUR;
const ACCOUNT_FAILURES_PER_HOUR = 50;
const WRONG = "Wrong register number or password.";

// Members log in with their register number and password. Every failure gets the same answer, so
// the endpoint can't be used to find out which register numbers belong to members.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Cross-site request blocked.", 403);
  const body = await readJson(request, 2048);
  if (!body.ok) return body.response;
  const parsed = bodySchema.safeParse(body.data);
  if (!parsed.success) return jsonError("Enter your register number and password.", 400);

  // Layered so a stranger can neither grind passwords nor lock someone else out:
  //  - per address (every attempt counts), and per address+account (so one machine can't hammer one account);
  //  - per account, counting only FAILED attempts, and only refused for addresses that have not logged in to that
  //    account before. The owner on their usual network gets through while someone guesses from elsewhere.
  const registerNo = normalizeRegisterNo(parsed.data.registerNo);
  const ip = clientIp(request);
  const [byIp, byPair] = await Promise.all([
    rateLimit(`login-ip:${ip}`, 30, HOUR),
    rateLimit(`login-pair:${registerNo}:${ip}`, 10, HOUR),
  ]);
  const limit = byIp.limited ? byIp : byPair.limited ? byPair : null;
  if (limit) {
    return jsonError("Too many attempts. Please try again later.", 429, { headers: { "Retry-After": String(limit.retryAfterSec) } });
  }
  const [failures, knownDevice] = await Promise.all([
    peekLimit(`login-fail:${registerNo}`, ACCOUNT_FAILURES_PER_HOUR, HOUR),
    peekLimit(`login-known:${registerNo}:${ip}`, Number.MAX_SAFE_INTEGER, KNOWN_DEVICE_MS),
  ]);
  if (failures.limited && !(knownDevice.count && knownDevice.count > 0)) {
    return jsonError("Too many attempts. Please try again later.", 429, { headers: { "Retry-After": String(failures.retryAfterSec) } });
  }

  try {
    const result = await loginWithPassword(parsed.data.registerNo, parsed.data.password);
    if (!result) {
      await rateLimit(`login-fail:${registerNo}`, ACCOUNT_FAILURES_PER_HOUR, HOUR); // counts this failure
      return jsonError(WRONG, 401);
    }
    await rateLimit(`login-known:${registerNo}:${ip}`, Number.MAX_SAFE_INTEGER, KNOWN_DEVICE_MS); // remember this address for this account
    const res = NextResponse.json({ success: true, user: result.user });
    setSessionCookie(res, result.token, result.expires);
    return res;
  } catch (err) {
    log.error("Login failed", err);
    return jsonError("Login failed. Please try again.", 500);
  }
}
