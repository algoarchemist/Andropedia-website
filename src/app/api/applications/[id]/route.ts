import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES, sendDecision } from "@/lib/recruitment/decision";
import { applicationScope, canAccessApplication } from "@/lib/recruitment/scope";

const patchSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  notify: z.boolean().optional().default(false),
});

// Move an applicant to a new status (accept, reject, shortlist), optionally emailing them the decision.
// A lead can decide only applicants to their own domain; a super admin can decide any.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const scope = applicationScope(auth.user);
  if (!scope) return jsonError("Your club role does not have access to this.", 403);
  const { id } = await params;

  const body = await readJson(request, 2 * 1024);
  if (!body.ok) return body.response;
  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) return jsonError("Choose a valid status.", 400);
  const { status, notify } = parsed.data;
  if (notify && status === "new") return jsonError("There is no email for the \"new\" status.", 400);

  try {
    const existing = await prisma.application.findUnique({ where: { id } });
    // The same answer for "no such application" and "another domain's": a lead learns nothing about other domains.
    if (!existing || !canAccessApplication(scope, existing.domain)) return jsonError("Application not found.", 404);
    const application = await prisma.application.update({ where: { id }, data: { status } });

    let emailed: boolean | null = null;
    if (notify && status !== "new" && status !== existing.status) {
      try {
        await sendDecision(application, status);
        emailed = true;
      } catch (err) {
        emailed = false;
        log.warn("Decision email failed", { reference: application.reference }, err);
      }
    }
    await recordAudit({
      actorId: auth.user.id,
      action: "application.status",
      target: id,
      meta: { reference: application.reference, domain: application.domain, from: existing.status, to: status, emailed },
    });
    return NextResponse.json({ success: true, application, emailed });
  } catch (err) {
    log.error("Application update failed", err);
    return jsonError("Internal server error", 500);
  }
}
