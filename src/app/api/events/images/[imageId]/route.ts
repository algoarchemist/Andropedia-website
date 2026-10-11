import { NextResponse } from "next/server";
import { getEventImage } from "@/lib/events";
import { log } from "@/lib/logger";

// Public: serves a photo uploaded for an event from the member portal. Image ids never change content,
// so browsers and the CDN can keep a copy for a year.
export async function GET(_request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  try {
    const image = await getEventImage(imageId);
    if (!image) return NextResponse.json({ error: "Photo not found" }, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    return new NextResponse(Buffer.from(image.data), {
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    log.error("Event photo read failed", error);
    return NextResponse.json({ error: "Photo unavailable" }, { status: 500 });
  }
}
