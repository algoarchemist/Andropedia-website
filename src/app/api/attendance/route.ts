import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { createDomainSession, listDomainAttendance } from "@/lib/attendance";
import { sessionCreateSchema } from "@/lib/attendance-schema";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";

// Attendance for a domain's leads and co-leads: the club-wide sessions, their own domain's meets, and their domain's members.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request, ["domain_admin"]);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ success: true, ...(await listDomainAttendance(auth.user)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleDataError(err, "Listing domain attendance");
  }
}

// Start a meet for the lead's own domain (a club hour or Google Meet), or open the session of an event.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ["domain_admin"]);
  if (!auth.ok) return auth.response;

  const body = await readJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = sessionCreateSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid session.", 400);

  try {
    return NextResponse.json({ success: true, session: await createDomainSession(auth.user, parsed.data) }, { status: 201 });
  } catch (err) {
    return handleDataError(err, "Creating a domain attendance session");
  }
}
