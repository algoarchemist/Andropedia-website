import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma";
import { sendMail, escapeHtml as esc } from "./mailer";
import { siteUrl } from "./site";

const RESET_MINUTES = 30;
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/** Rules for a password a member chooses. */
export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(60, "Use at most 60 characters.");

/** Creates a one-time reset link for the member and emails it to their registered address. */
export async function sendPasswordReset(user: { id: string; name: string; email: string }): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  // Only the newest link works.
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
  await prisma.passwordReset.create({
    data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000) },
  });

  const link = new URL(`/portal/reset-password?token=${token}`, siteUrl()).toString();
  const text = [
    `Hi ${user.name},`,
    "",
    "Someone asked to reset the password for your Andropedia member portal account.",
    `Use this link within ${RESET_MINUTES} minutes to choose a new password:`,
    link,
    "",
    "If this was not you, ignore this email. Your password stays the same.",
    "",
    "- Team Andropedia",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;max-width:560px">
<p>Hi ${esc(user.name)},</p>
<p>Someone asked to reset the password for your Andropedia member portal account.</p>
<p><a href="${esc(link)}" style="display:inline-block;padding:10px 18px;background:#10b981;color:#000;text-decoration:none;border-radius:8px;font-weight:bold">Choose a new password</a></p>
<p>This link works once and expires in ${RESET_MINUTES} minutes. If this was not you, ignore this email and your password stays the same.</p>
<p>- Team Andropedia</p></div>`;
  await sendMail({ to: user.email, subject: "Reset your Andropedia password", text, html });
}

/** Sets a new password from an emailed token. Returns false if the link is unknown, used or expired. */
export async function consumePasswordReset(token: string, passwordHash: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // The conditional update claims the token atomically, so a link can't be used twice.
    const claimed = await tx.passwordReset.updateManyAndReturn({
      where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    const reset = claimed[0];
    if (!reset) return false;
    const updated = await tx.user.updateMany({ where: { id: reset.userId, isActive: true }, data: { passwordHash, mustChangePassword: false } });
    if (updated.count === 0) return false;
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
    return true;
  });
}
