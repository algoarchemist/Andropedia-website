import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { setMemberPhoto } from "@/lib/data-store";
import { jsonError, readBodyLimited } from "@/lib/http";
import { MAX_PHOTO_BYTES, sniffPhotoType } from "@/lib/member-profile";
import { rateLimit } from "@/lib/rate-limit-db";

// A member replaces their own picture. The request body is the image itself (JPEG, PNG or WebP, up to 400 KB): the portal crops and
// shrinks the photo in the browser first. The new picture overwrites the old one in the same database row, so no earlier photo is kept.
export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(`photo:${auth.user.id}`, 10, 60 * 60 * 1000);
  if (limit.limited) {
    return jsonError("Too many photo changes. Please try again later.", 429, { headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  let bytes: Uint8Array | null;
  try {
    // Stops reading as soon as the body passes the limit, even when the client sent no Content-Length.
    bytes = await readBodyLimited(request, MAX_PHOTO_BYTES);
  } catch {
    return jsonError("The photo could not be read.", 400);
  }
  if (!bytes) return jsonError("The photo is too large (400 KB at most).", 413);
  if (bytes.length === 0) return jsonError("Choose a photo to upload.", 400);
  const mime = sniffPhotoType(bytes);
  if (!mime) return jsonError("Use a JPEG, PNG or WebP image.", 415);

  try {
    return NextResponse.json({ success: true, user: await setMemberPhoto(auth.user.id, auth.user.id, { mime, data: bytes }) });
  } catch (err) {
    return handleDataError(err, "Changing a profile photo");
  }
}
