import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { deleteWeek, updateWeek } from "@/lib/data-store";
import { jsonError, readJson } from "@/lib/http";

const date = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date.");

const weekPatchSchema = z.object({
  weekNumber: z.number().int().min(1).max(500).optional(),
  title: z.string().trim().min(3).max(120).optional(),
  theme: z.string().trim().min(3).max(120).optional(),
  startDate: date.optional(),
  endDate: date.optional(),
  promptDescription: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
});

// Edit a week, or open/close it with { "isActive": true | false }. Opening a week closes the others.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = await readJson(request, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = weekPatchSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid week.", 400);
  if (Object.keys(parsed.data).length === 0) return jsonError("Nothing to change.", 400);

  try {
    return NextResponse.json({ success: true, week: await updateWeek(id, parsed.data, auth.user.id) });
  } catch (err) {
    return handleDataError(err, "Updating a week");
  }
}

// Removes a week added by mistake. Refused (409) while members have submitted to it.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    await deleteWeek(id, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleDataError(err, "Deleting a week");
  }
}
