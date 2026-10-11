import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { deleteMember, updateMember } from "@/lib/data-store";
import { jsonError, readJson } from "@/lib/http";
import { linkedinField } from "@/lib/member-profile";

const memberPatchSchema = z.object({
  name: z.string().trim().min(2, "Enter the member's name.").max(80).optional(),
  bio: z.string().trim().max(600, "Keep the description under 600 characters.").optional(),
  linkedin: linkedinField.optional(),
  role: z.enum(["member", "domain_admin", "super_admin"]).optional(),
  position: z.enum(["president", "vice_president", "chief", "lead", "co_lead", "member"]).optional(),
  domain: z.enum(["Technical", "Web", "PR", "R&D", "Design", "Media"]).optional(),
  isActive: z.boolean().optional(),
});

// Change a member's profile (name, description, LinkedIn), permission role, team position, domain or active status (super admin only).
// You can't demote or deactivate yourself, and the last super admin can't be removed.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = await readJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = memberPatchSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid change.", 400);

  try {
    return NextResponse.json({ success: true, member: await updateMember(auth.user.id, id, parsed.data) });
  } catch (err) {
    return handleDataError(err, "Updating a member");
  }
}

// Remove a member for good (super admin only). Not yourself, and not the last super admin.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deleteMember(auth.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleDataError(err, "Removing a member");
  }
}
