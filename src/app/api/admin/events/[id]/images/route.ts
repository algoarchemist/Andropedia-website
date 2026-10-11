import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { addEventImage, MAX_EVENT_IMAGE_BYTES } from "@/lib/events";
import { jsonError, readBodyLimited } from "@/lib/http";
import { sniffPhotoType } from "@/lib/member-profile";

// Add one photo to an event: the request body is the image itself (JPEG, PNG or WebP, up to 900 KB).
// The portal shrinks photos in the browser first and sends them one at a time. Super admin only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  let bytes: Uint8Array | null;
  try {
    // Stops reading as soon as the body passes the limit, even when the client sent no Content-Length.
    bytes = await readBodyLimited(request, MAX_EVENT_IMAGE_BYTES);
  } catch {
    return jsonError("The photo could not be read.", 400);
  }
  if (!bytes) return jsonError("That photo is too large (900 KB at most).", 413);
  if (bytes.length === 0) return jsonError("Choose a photo to upload.", 400);
  const mime = sniffPhotoType(bytes);
  if (!mime) return jsonError("Use JPEG, PNG or WebP images.", 415);

  try {
    return NextResponse.json({ success: true, photo: await addEventImage(id, { mime, data: bytes }, auth.user.id) }, { status: 201 });
  } catch (err) {
    return handleDataError(err, "Uploading an event photo");
  }
}
