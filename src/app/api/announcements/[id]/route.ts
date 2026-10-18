import { NextRequest, NextResponse } from "next/server";
import { deleteAnnouncement } from "@/lib/announcements";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";

// Remove an announcement. A lead can remove their own domain's, or an everyone-message they wrote; a super admin can remove any.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteAnnouncement(auth.user, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleDataError(err, "Removing an announcement");
  }
}
