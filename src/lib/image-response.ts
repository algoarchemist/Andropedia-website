import { NextResponse } from "next/server";
import { clientIp } from "./http";
import { log } from "./logger";
import { checkRateLimit } from "./recruitment/rate-limit";

// Serves a picture that is stored in the database (member photos, event photos). These are public on purpose, so the route
// is hardened instead of locked: ids are checked before any query, one address can't pull them without limit, and a
// missing table (a migration not applied yet) reads as "no photo" instead of a crash.

const ID_PATTERN = /^[A-Za-z0-9_-]{6,40}$/;
const PER_10_MIN = 600; // a team page shows dozens of photos at once, so the limit is generous
const SHORT = { "Cache-Control": "public, max-age=60" };

/** Prisma error codes for "table / column does not exist": the migration has not been applied. */
const isMissingTable = (err: unknown) => typeof err === "object" && err !== null && ["P2021", "P2022"].includes((err as { code?: string }).code ?? "");

export async function serveStoredImage(
  request: Request,
  id: string,
  load: (id: string) => Promise<{ mime: string; data: Uint8Array } | null>,
  label: string,
): Promise<NextResponse> {
  if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "Photo not found" }, { status: 404, headers: SHORT });

  const limit = checkRateLimit(`img-ip:${clientIp(request)}`, PER_10_MIN, 10 * 60 * 1000);
  if (limit.limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  try {
    const image = await load(id);
    if (!image) return NextResponse.json({ error: "Photo not found" }, { status: 404, headers: SHORT });
    return new NextResponse(Buffer.from(image.data), {
      headers: {
        "Content-Type": image.mime,
        // The id (or the ?v= stamp on member photos) changes whenever the picture does, so it can be kept for a year.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    if (isMissingTable(error)) {
      log.warn(`${label}: the photo table is missing. Run the database migrations.`);
      return NextResponse.json({ error: "Photo not found" }, { status: 404, headers: SHORT });
    }
    log.error(`${label} read failed`, error);
    return NextResponse.json({ error: "Photo unavailable" }, { status: 500 });
  }
}
