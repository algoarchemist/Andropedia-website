import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { getLoginSummary } from "@/lib/login-days";
import { log } from "@/lib/logger";

// The signed-in member's login streak (consecutive days up to today) and how many days they have logged in in all.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ success: true, ...(await getLoginSummary(auth.user.id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    log.error("Streak load failed", err);
    return jsonError("Could not load your streak.", 500);
  }
}
