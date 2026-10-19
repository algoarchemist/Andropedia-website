import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { deleteDomainSession, getDomainAttendance, setDomainPresence } from "@/lib/attendance";
import { markSchema } from "@/lib/attendance-schema";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";

// Which of the lead's own domain members were present at this session.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    return NextResponse.json({ success: true, ...(await getDomainAttendance(auth.user, id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleDataError(err, "Reading domain attendance");
  }
}

// Mark members of the lead's own domain present, or take the mark back.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = await readJson(request, 64 * 1024);
  if (!body.ok) return body.response;
  const parsed = markSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.", 400);

  try {
    return NextResponse.json({ success: true, ...(await setDomainPresence(auth.user, id, parsed.data.userIds, parsed.data.present)) });
  } catch (err) {
    return handleDataError(err, "Marking domain attendance");
  }
}

// Delete a meet the lead's domain ran. Club-wide sessions can only be deleted by a super admin.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteDomainSession(auth.user, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleDataError(err, "Deleting a domain attendance session");
  }
}
