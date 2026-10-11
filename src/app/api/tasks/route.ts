import { log } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ConflictError, getTasks, NotFoundError, submitTask } from "@/lib/data-store";
import { readJson } from "@/lib/http";

const shortText = z.string().trim().max(64).nullable().transform((v) => v || null);
const querySchema = z.object({
  weekId: shortText,
  domain: shortText,
  userId: shortText,
  status: z.string().trim().max(12).nullable().transform((v) => v?.toLowerCase() || null)
    .refine((v) => v === null || v === "submitted" || v === "evaluated", "Unknown status"),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const query = querySchema.safeParse({
    weekId: searchParams.get("weekId"),
    domain: searchParams.get("domain"),
    userId: searchParams.get("userId"),
    status: searchParams.get("status"),
  });
  if (!query.success) return NextResponse.json({ success: false, error: "Invalid filter." }, { status: 400 });
  const filters = { ...query.data };

  // Members see only their own submissions; domain leads only their own domain.
  if (user.role === "member") {
    filters.userId = user.id;
  } else if (user.role === "domain_admin") {
    filters.domain = user.domain;
  }

  try {
    const tasks = await getTasks(filters);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    log.error("Loading tasks failed", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || (/^https?:\/\//i.test(v) && URL.canParse(v)), "Enter a valid http(s) URL.")
  .optional();

const taskSchema = z.object({
  weekId: z.string().min(1, "Choose a sprint week."),
  title: z.string().trim().min(3, "Add a title.").max(120),
  description: z.string().trim().min(10, "Add a short description.").max(4000),
  githubUrl: optionalUrl,
  liveUrl: optionalUrl,
  figmaUrl: optionalUrl,
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const body = await readJson(request, 16 * 1024);
  if (!body.ok) return body.response;
  const parsed = taskSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400 }
    );
  }

  try {
    // Identity and domain come from the session, never from the request body.
    const { task, created } = await submitTask({ ...parsed.data, userId: user.id, domain: user.domain });
    return NextResponse.json({ success: true, task, created }, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof ConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    log.error("Creating a task failed", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
