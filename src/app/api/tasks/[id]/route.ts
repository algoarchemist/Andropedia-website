import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { deleteTask } from "@/lib/data-store";

// Delete a submission: the member who sent it (until it is graded), their domain's leads and co-leads, or a super admin.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    await deleteTask(id, auth.user);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleDataError(err, "Deleting a submission");
  }
}
