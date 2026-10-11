import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { createMember, getUsers } from "@/lib/data-store";
import { jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { sendMemberInvite } from "@/lib/member-invite";
import { linkedinField } from "@/lib/member-profile";

const memberCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter the member's name.").max(80),
  email: z.string().trim().toLowerCase().max(160).pipe(z.email("Enter a valid email.")),
  registerNo: z.string().trim().min(6, "Enter the register number.").max(30).regex(/^[A-Za-z0-9 ]+$/, "Enter a valid register number."),
  domain: z.enum(["Technical", "Web", "PR", "R&D", "Design", "Media"]),
  role: z.enum(["member", "domain_admin", "super_admin"]).optional(),
  position: z.enum(["president", "vice_president", "chief", "lead", "co_lead", "member"]).optional(),
  bio: z.string().trim().max(600, "Keep the description under 600 characters.").optional(),
  linkedin: linkedinField.optional(),
});

// Full member list including emails: super admins only.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ success: true, members: await getUsers() });
}

// Add a member. They log in with their register number; the starting password is the same (super admin only).
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;

  const body = await readJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = memberCreateSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid member.", 400);

  try {
    const member = await createMember(auth.user.id, parsed.data);
    // Welcome email after the response; the member is already added even if it fails.
    after(async () => {
      try {
        await sendMemberInvite(member);
      } catch (err) {
        log.warn("Member invite email failed", { memberId: member.id }, err);
      }
    });
    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (err) {
    return handleDataError(err, "Adding a member");
  }
}
