import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { deleteEventImage } from "@/lib/events";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id, imageId } = await params;
  try {
    await deleteEventImage(id, imageId, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleDataError(err, "Deleting an event photo");
  }
}
