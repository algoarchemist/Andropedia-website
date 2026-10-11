import { log } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser().catch((err) => {
    log.error("Session lookup failed", err);
    return null;
  });
  return NextResponse.json({ success: true, user }, { headers: { "Cache-Control": "no-store" } });
}
