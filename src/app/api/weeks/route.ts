import { NextResponse } from "next/server";
import { getWeeks } from "@/lib/data-store";
import { jsonError } from "@/lib/http";
import { log } from "@/lib/logger";

export async function GET() {
  try {
    const weeks = await getWeeks();
    // Never cached: opening or closing a week must show up for members straight away.
    return NextResponse.json({ success: true, weeks }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    log.error("Weeks load failed", err);
    return jsonError("Could not load the sprint weeks.", 500);
  }
}
