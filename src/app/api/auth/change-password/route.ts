import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, revokeOtherSessions } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { hashChosenPassword, normalizeRegisterNo, verifyPassword } from "@/lib/password";
import { newPasswordSchema } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit-db";

const bodySchema = z.object({ currentPassword: z.string().min(1).max(60), newPassword: newPasswordSchema });

// A signed-in member changes their own password by proving the old one.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, undefined, { allowPasswordChange: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(request, 2048);
  if (!body.ok) return body.response;
  const parsed = bodySchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the form and try again.", 400);
  const { currentPassword, newPassword } = parsed.data;

  const limit = await rateLimit(`pwchange:${auth.user.id}`, 10, 60 * 60 * 1000);
  if (limit.limited) {
    return jsonError("Too many attempts. Please try again later.", 429, { headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  try {
    const row = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { passwordHash: true, registerNo: true } });
    if (!verifyPassword(currentPassword, row?.passwordHash)) return jsonError("Your current password is wrong.", 400);
    if (verifyPassword(newPassword, row?.passwordHash)) return jsonError("Choose a password different from your current one.", 400);

    // The register number is the default password, so it can't be the new one either.
    if (row?.registerNo && normalizeRegisterNo(newPassword) === row.registerNo) return jsonError("Choose a password that is not your register number.", 400);

    await prisma.user.update({ where: { id: auth.user.id }, data: { passwordHash: hashChosenPassword(newPassword), mustChangePassword: false } });
    await revokeOtherSessions(auth.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Password change failed", err);
    return jsonError("Could not change the password. Please try again.", 500);
  }
}
