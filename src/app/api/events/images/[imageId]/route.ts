import { getEventImage } from "@/lib/events";
import { serveStoredImage } from "@/lib/image-response";

// Public: serves a photo uploaded for an event from the member portal. Image ids never change content,
// so browsers and the CDN can keep a copy for a year.
export async function GET(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await params;
  return serveStoredImage(request, imageId, getEventImage, "Event photo");
}
