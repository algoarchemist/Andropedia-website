import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteTaskPrompt, ForbiddenError, NotFoundError } from "@/lib/data-store";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteTaskPrompt(id, auth.user);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NotFoundError) return jsonError(err.message, 404);
    if (err instanceof ForbiddenError) return jsonError(err.message, 403);
    log.error("Removing a task failed", err);
    return jsonError("Could not remove the task.", 500);
  }
}
