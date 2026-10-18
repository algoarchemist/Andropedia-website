import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnnouncement, listAnnouncements } from "@/lib/announcements";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit-db";

const DOMAINS = ["Technical", "Web", "PR", "R&D", "Design", "Media"] as const;

// The signed-in member's announcements, newest first: their own domain's and the ones for everyone (a super admin gets all).
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ success: true, announcements: await listAnnouncements(auth.user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    log.error("Announcements load failed", err);
    return jsonError("Could not load announcements.", 500);
  }
}

const postSchema = z.object({
  title: z.string().trim().min(3, "Add a short title.").max(80, "Keep the title under 80 characters."),
  body: z.string().trim().min(3, "Write the message.").max(1500, "Keep the message under 1500 characters."),
  domain: z.enum([...DOMAINS, "All"]).optional(), // leads: their own domain or "All" (any other domain falls back to their own); super admins: any
});

// A lead posts a message for their domain's members, or for everyone. A super admin can pick any domain.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;

  const body = await readJson(request, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = postSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Check the form and try again.", 400);

  const limit = await rateLimit(`announce:${auth.user.id}`, 20, 60 * 60 * 1000);
  if (limit.limited) return jsonError("Too many announcements. Please try again later.", 429, { headers: { "Retry-After": String(limit.retryAfterSec) } });

  try {
    await createAnnouncement(auth.user, parsed.data);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return handleDataError(err, "Posting an announcement");
  }
}
