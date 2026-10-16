import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { applicationScope } from "@/lib/recruitment/scope";

// Recruitment applicants, newest first. Contains personal data (phone, email, register number): a lead sees only the applicants
// to their own domain, a super admin sees every domain.
// Each applicant carries the signed-in reviewer's own private rating and comment (`myReview`). Only a super admin also gets what
// the other reviewers wrote (`otherReviews`): leads never see each other's notes.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const scope = applicationScope(auth.user);
  if (!scope) return jsonError("Your club role does not have access to this.", 403);
  const noStore = { "Cache-Control": "no-store" };

  // A lead whose domain takes no applications (R&D) has nothing to read.
  if (scope.kind === "domain" && scope.domain === null) {
    return NextResponse.json({ success: true, scope: "domain", applications: [] }, { headers: noStore });
  }

  try {
    const rows = await prisma.application.findMany({
      where: scope.kind === "domain" ? { domain: scope.domain! } : undefined,
      include: { reviews: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const reviewerIds = scope.kind === "all" ? [...new Set(rows.flatMap((r) => r.reviews.map((v) => v.reviewerId)))] : [];
    const names = new Map(
      reviewerIds.length ? (await prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]) : [],
    );

    const applications = rows.map(({ reviews, ...application }) => {
      const mine = reviews.find((v) => v.reviewerId === auth.user.id);
      return {
        ...application,
        myReview: mine ? { rating: mine.rating, comment: mine.comment ?? "" } : null,
        otherReviews:
          scope.kind === "all"
            ? reviews
                .filter((v) => v.reviewerId !== auth.user.id)
                .map((v) => ({ reviewer: names.get(v.reviewerId) ?? "Former reviewer", rating: v.rating, comment: v.comment ?? "" }))
            : [],
      };
    });
    return NextResponse.json({ success: true, scope: scope.kind, applications }, { headers: noStore });
  } catch (error) {
    log.error("Applications load failed", error);
    return jsonError("Could not load applications", 500);
  }
}
