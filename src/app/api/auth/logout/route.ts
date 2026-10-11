import { log } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, destroyCurrentSession, isSameOrigin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ success: false, error: "Cross-site request blocked." }, { status: 403 });
  }
  await destroyCurrentSession().catch((err) => log.error("Logout cleanup failed", err));
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
