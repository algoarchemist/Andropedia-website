import { NextRequest, NextResponse } from "next/server";
import { handleDataError } from "@/lib/api-errors";
import { importAttendanceCsv } from "@/lib/attendance";
import { MAX_ATTENDANCE_CSV_BYTES, importSchema } from "@/lib/attendance-schema";
import { requireUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";

// Mark everyone listed in a CSV (by register number or email) present at one session. Body: { csv: "<file text>" }.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ["super_admin"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = await readJson(request, MAX_ATTENDANCE_CSV_BYTES + 1024);
  if (!body.ok) return body.response;
  const parsed = importSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid file.", 400);

  try {
    return NextResponse.json({ success: true, report: await importAttendanceCsv(auth.user.id, id, parsed.data.csv) });
  } catch (err) {
    return handleDataError(err, "Importing attendance");
  }
}
