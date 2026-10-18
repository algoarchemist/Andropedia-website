import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { createAttendanceSession, listAttendanceSessions } from "@/lib/attendance";
import { sessionCreateSchema } from "@/lib/attendance-schema";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";

// Attendance sessions (events, club hours and Google Meets), super admins only. Also lists the events that can be picked.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ success: true, ...(await listAttendanceSessions()) });
  } catch (err) {
    return handleDataError(err, "Listing attendance sessions");
  }
}

// Start a club hour or Google Meet, or open the session of an event (created on first use).
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;

  const body = await readJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = sessionCreateSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid session.", 400);

  try {
    return NextResponse.json({ success: true, session: await createAttendanceSession(auth.user.id, parsed.data) }, { status: 201 });
  } catch (err) {
    return handleDataError(err, "Creating an attendance session");
  }
}
