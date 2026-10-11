import { NextRequest, NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/cron-auth";
import { configProblems } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { schemaProblems } from "@/lib/schema-check";
import { pendingWhere } from "@/lib/recruitment/retry";

// Uptime/health check. Public callers only learn ok/degraded; the detailed list of
// configuration problems is shown only with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  let database = true;
  let waiting: number | null = null;
  try {
    waiting = await prisma.application.count({ where: pendingWhere() });
  } catch {
    database = false;
  }
  const problems = [...configProblems(), ...(database ? await schemaProblems() : [])];
  const ok = database && problems.length === 0;
  const body: Record<string, unknown> = { status: ok ? "ok" : "degraded", database };
  if (hasCronSecret(request)) {
    body.problems = problems;
    body.unsyncedApplications = waiting;
  }
  return NextResponse.json(body, { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
