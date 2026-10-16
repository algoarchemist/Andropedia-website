import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { applicationScope, canAccessApplication } from "@/lib/recruitment/scope";

const reviewSchema = z.object({
  rating: z.number().int("Rate from 1 to 10.").min(1, "Rate from 1 to 10.").max(10, "Rate from 1 to 10.").nullable().default(null),
  comment: z.string().trim().max(1000, "Keep the comment under 1000 characters.").default(""),
});

// A reviewer's private rating (1 to 10) and comment on an application, for their own reference. One per reviewer: saving again
// edits it, and saving it empty removes it. Leads can review only applicants to their own domain.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const scope = applicationScope(auth.user);
  if (!scope) return jsonError("Your club role does not have access to this.", 403);
  const { id } = await params;

  const body = await readJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = reviewSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the form and try again.", 400);
  const { rating, comment } = parsed.data;

  try {
    const application = await prisma.application.findUnique({ where: { id }, select: { id: true, domain: true } });
    if (!application || !canAccessApplication(scope, application.domain)) return jsonError("Application not found.", 404);

    const where = { applicationId_reviewerId: { applicationId: id, reviewerId: auth.user.id } };
    if (rating === null && !comment) {
      await prisma.applicationReview.deleteMany({ where: { applicationId: id, reviewerId: auth.user.id } });
      return NextResponse.json({ success: true, review: null });
    }
    const saved = await prisma.applicationReview.upsert({
      where,
      create: { applicationId: id, reviewerId: auth.user.id, rating, comment: comment || null },
      update: { rating, comment: comment || null },
    });
    return NextResponse.json({ success: true, review: { rating: saved.rating, comment: saved.comment ?? "", updatedAt: saved.updatedAt } });
  } catch (err) {
    log.error("Saving a review failed", err);
    return jsonError("Could not save your notes. Please try again.", 500);
  }
}
