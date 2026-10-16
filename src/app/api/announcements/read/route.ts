import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { markAnnouncementsRead } from "@/lib/announcements";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";

const schema = z.object({ ids: z.array(z.string().min(1).max(40)).max(50) });

// The member has seen these announcements, so the dashboard stops marking them "new".
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const body = await readJson(request, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return jsonError("Invalid request.", 400);
  try {
    await markAnnouncementsRead(auth.user, parsed.data.ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Marking announcements read failed", err);
    return jsonError("Could not save that.", 500);
  }
}
