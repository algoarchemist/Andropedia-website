import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/http";
import { checkRateLimit } from "@/lib/recruitment/rate-limit";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

// A team page can show dozens of photos at once, so the limit is generous. It is in memory on
// purpose: a database round trip per image would cost more than it protects.
const PHOTOS_PER_10_MIN = 600;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { fileId } = await params;

  if (!/^[a-zA-Z0-9_-]{10,100}$/.test(fileId)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 });
  }

  const limit = checkRateLimit(`photo-ip:${clientIp(request)}`, PHOTOS_PER_10_MIN, 10 * 60 * 1000);
  if (limit.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  // Google's thumbnails rarely change: let Next keep a copy for an hour instead of asking every time.
  let response: Response;
  try {
    response = await fetch(`https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400-h400`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000), // a slow Drive must not pin a server connection
    });
  } catch {
    return NextResponse.json({ error: "Member photo unavailable" }, { status: 502, headers: { "Cache-Control": "public, max-age=30" } });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Member photo unavailable" }, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
