import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth";
import { clientIp, jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { isMailConfigured } from "@/lib/mailer";
import { normalizeRegisterNo } from "@/lib/password";
import { sendPasswordReset } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit-db";

const bodySchema = z.object({ registerNo: z.string().trim().min(4).max(30) });
const HOUR = 60 * 60 * 1000;

// Emails a reset link to the address the member registered with. The answer is the same whether or
// not the register number exists, so this can't be used to find out who is a member.
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Cross-site request blocked.", 403);
  const body = await readJson(request, 2048);
  if (!body.ok) return body.response;
  const parsed = bodySchema.safeParse(body.data);
  if (!parsed.success) return jsonError("Enter your register number.", 400);
  const registerNo = normalizeRegisterNo(parsed.data.registerNo);

  const [byIp, byAccount] = await Promise.all([
    rateLimit(`forgot-ip:${clientIp(request)}`, 10, HOUR),
    rateLimit(`forgot-reg:${registerNo}`, 3, HOUR),
  ]);
  const limit = byIp.limited ? byIp : byAccount.limited ? byAccount : null;
  if (limit) {
    return jsonError("Too many requests. Please try again later.", 429, { headers: { "Retry-After": String(limit.retryAfterSec) } });
  }
  if (!isMailConfigured()) return jsonError("Password reset email isn't available right now. Please ask a club admin.", 503);

  try {
    const user = await prisma.user.findUnique({ where: { registerNo }, select: { id: true, name: true, email: true, isActive: true } });
    // The reset (database writes and the email) happens after the answer is sent, so a real account and an unknown one
    // take the same time to answer and the response can't be used to tell members from strangers.
    if (user?.isActive && user.email) {
      after(async () => {
        try {
          await sendPasswordReset(user);
        } catch (err) {
          log.error("Password reset email failed", err);
        }
      });
    }
  } catch (err) {
    log.error("Password reset email failed", err);
  }
  return NextResponse.json({ success: true });
}
