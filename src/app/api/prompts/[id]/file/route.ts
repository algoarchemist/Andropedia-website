import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ForbiddenError, getPromptFile, MAX_PROMPT_PDF_BYTES, NotFoundError, removePromptFile, setPromptFile } from "@/lib/data-store";
import { jsonError, readBodyLimited } from "@/lib/http";
import { log } from "@/lib/logger";

const isPdf = (b: Uint8Array) => b.length > 5 && String.fromCharCode(b[0], b[1], b[2], b[3], b[4]) === "%PDF-";

/** A safe display name: no path parts or control characters, always ending in .pdf. */
function cleanName(raw: string | null): string {
  const base = (raw ?? "").split(/[\\/]/).pop() ?? "";
  const stem = base.replace(/\.pdf$/i, "").replace(/[^\w .()-]+/g, "").trim().slice(0, 80);
  return `${stem || "task-brief"}.pdf`;
}

function fail(err: unknown, what: string) {
  if (err instanceof NotFoundError) return jsonError(err.message, 404);
  if (err instanceof ForbiddenError) return jsonError(err.message, 403);
  log.error(`${what} failed`, err);
  return jsonError("Something went wrong. Try again.", 500);
}

// Download the PDF brief. Members and leads get their own domain's; super admins get any.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const file = await getPromptFile(id, auth.user);
    if (!file) return jsonError("No PDF attached.", 404);
    return new NextResponse(Buffer.from(file.data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${file.name.replace(/[^\w .()-]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return fail(err, "Reading a task PDF");
  }
}

// Attach or replace the PDF: the request body is the PDF itself (up to 4 MB), the name goes in ?name=.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  let bytes: Uint8Array | null;
  try {
    bytes = await readBodyLimited(request, MAX_PROMPT_PDF_BYTES);
  } catch {
    return jsonError("The file could not be read.", 400);
  }
  if (!bytes) return jsonError("That PDF is too large (4 MB at most).", 413);
  if (bytes.length === 0) return jsonError("Choose a PDF to upload.", 400);
  if (!isPdf(bytes)) return jsonError("Only PDF files are accepted.", 415);

  try {
    const name = cleanName(new URL(request.url).searchParams.get("name"));
    return NextResponse.json({ success: true, prompt: await setPromptFile(id, { name, data: bytes }, auth.user) });
  } catch (err) {
    return fail(err, "Saving a task PDF");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await removePromptFile(id, auth.user);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err, "Removing a task PDF");
  }
}
