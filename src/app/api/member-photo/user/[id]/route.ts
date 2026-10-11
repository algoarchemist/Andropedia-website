import { NextResponse } from "next/server";
import { getMemberPhoto } from "@/lib/data-store";
import { log } from "@/lib/logger";

// Public: serves a picture uploaded from the member portal (the same photos the Team page shows).
// The avatar URL carries a `?v=` stamp that changes on every upload, so it can be cached for a long time.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const photo = await getMemberPhoto(id);
    if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    return new NextResponse(Buffer.from(photo.data), {
      headers: {
        "Content-Type": photo.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    log.error("Member photo read failed", error);
    return NextResponse.json({ error: "Photo unavailable" }, { status: 500 });
  }
}
