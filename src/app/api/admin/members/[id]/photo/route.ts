import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { requireUser } from "@/lib/auth";
import { removeMemberPhoto, setMemberPhoto } from "@/lib/data-store";
import { jsonError } from "@/lib/http";
import { MAX_PHOTO_BYTES, sniffPhotoType } from "@/lib/member-profile";

// Upload a member's picture: the request body is the image itself (JPEG, PNG or WebP, up to 400 KB).
// The portal shrinks the photo in the browser first. Super admin only.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_PHOTO_BYTES) return jsonError("The photo is too large (400 KB at most).", 413);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return jsonError("The photo could not be read.", 400);
  }
  if (bytes.length === 0) return jsonError("Choose a photo to upload.", 400);
  if (bytes.length > MAX_PHOTO_BYTES) return jsonError("The photo is too large (400 KB at most).", 413);
  const mime = sniffPhotoType(bytes);
  if (!mime) return jsonError("Use a JPEG, PNG or WebP image.", 415);

  try {
    return NextResponse.json({ success: true, member: await setMemberPhoto(auth.user.id, id, { mime, data: bytes }) });
  } catch (err) {
    return handleDataError(err, "Uploading a member photo");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    return NextResponse.json({ success: true, member: await removeMemberPhoto(auth.user.id, id) });
  } catch (err) {
    return handleDataError(err, "Removing a member photo");
  }
}
