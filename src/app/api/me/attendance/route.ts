import { NextRequest, NextResponse } from "next/server";
import { getMemberAttendance } from "@/lib/attendance";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";

// The signed-in member's own attendance: the sessions and events they were present at.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ success: true, ...(await getMemberAttendance(auth.user.id, new Date(), auth.user.domain)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    log.error("Attendance load failed", err);
    return jsonError("Could not load your attendance.", 500);
  }
}
