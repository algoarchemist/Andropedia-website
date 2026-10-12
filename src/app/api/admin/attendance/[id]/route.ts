import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { deleteAttendanceSession, getAttendance, setPresence } from "@/lib/attendance";
import { markSchema } from "@/lib/attendance-schema";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";

// Who was present at one session (super admin only).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    return NextResponse.json({ success: true, ...(await getAttendance(id)) });
  } catch (err) {
    return handleDataError(err, "Reading attendance");
  }
}

// Mark members present, or take the mark back, by hand.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = await readJson(request, 64 * 1024);
  if (!body.ok) return body.response;
  const parsed = markSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.", 400);

  try {
    return NextResponse.json({ success: true, ...(await setPresence(auth.user.id, id, parsed.data.userIds, parsed.data.present)) });
  } catch (err) {
    return handleDataError(err, "Marking attendance");
  }
}

// Delete a session and all its marks.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteAttendanceSession(auth.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleDataError(err, "Deleting an attendance session");
  }
}
