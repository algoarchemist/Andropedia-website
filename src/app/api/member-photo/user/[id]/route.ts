import { getMemberPhoto } from "@/lib/data-store";
import { serveStoredImage } from "@/lib/image-response";

// Public: serves a picture uploaded from the member portal (the same photos the Team page shows).
// The avatar URL carries a `?v=` stamp that changes on every upload, so it can be cached for a long time.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return serveStoredImage(request, id, getMemberPhoto, "Member photo");
}
