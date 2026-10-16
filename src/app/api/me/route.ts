import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/logger";
import { getSessionUser, requireUser } from "@/lib/auth";
import { updateOwnProfile } from "@/lib/data-store";
import { jsonError, readJson } from "@/lib/http";
import { githubField, instagramField, linkedinField } from "@/lib/member-profile";
import { rateLimit } from "@/lib/rate-limit-db";

export async function GET() {
  const user = await getSessionUser().catch((err) => {
    log.error("Session lookup failed", err);
    return null;
  });
  return NextResponse.json({ success: true, user }, { headers: { "Cache-Control": "no-store" } });
}

const patchSchema = z
  .object({
    bio: z.string().trim().max(600, "Keep your about text under 600 characters."),
    linkedin: linkedinField,
    github: githubField,
    instagram: instagramField,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

// A member edits their own about text and LinkedIn, GitHub and Instagram links (an empty value clears a link).
export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the form and try again.", 400);

  const limit = await rateLimit(`bio:${auth.user.id}`, 30, 60 * 60 * 1000);
  if (limit.limited) {
    return jsonError("Too many changes. Please try again later.", 429, { headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  try {
    const user = await updateOwnProfile(auth.user.id, parsed.data);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    log.error("Saving a profile failed", err);
    return jsonError("Could not save your profile. Please try again.", 500);
  }
}
