import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ForbiddenError, getTaskPrompts, NotFoundError, saveTaskPrompt } from "@/lib/data-store";
import { jsonError, readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import type { DomainType } from "@/lib/types";

const DOMAINS = ["Web", "Technical", "R&D", "Design", "Media", "PR"] as const;

// Tasks set by leads. Members and leads see only their own domain; super admins see all (optionally one domain).
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId")?.slice(0, 64) || null;
  const asked = searchParams.get("domain") ?? "";
  const domain: DomainType | null =
    user.role === "super_admin" ? ((DOMAINS as readonly string[]).includes(asked) ? (asked as DomainType) : null) : user.domain;

  try {
    return NextResponse.json({ success: true, prompts: await getTaskPrompts({ weekId, domain }) });
  } catch (err) {
    log.error("Loading tasks failed", err);
    return jsonError("Could not load the tasks.", 500);
  }
}

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || (/^https?:\/\//i.test(v) && URL.canParse(v)), "Enter a valid http(s) URL.")
  .nullable()
  .optional();

const promptSchema = z.object({
  weekId: z.string().min(1, "Choose a sprint week."),
  domain: z.enum(DOMAINS).optional(), // super admins only; leads always post to their own domain
  title: z.string().trim().min(3, "Add a title.").max(120),
  description: z.string().trim().min(10, "Describe the task (at least 10 characters).").max(4000),
  resourceUrl: optionalUrl,
  dueDate: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid due date.")
    .nullable()
    .optional(),
});

// Post the task for a domain and week; posting again for the same pair edits it.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const body = await readJson(request, 16 * 1024);
  if (!body.ok) return body.response;
  const parsed = promptSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid task.", 400);

  const domain = user.role === "domain_admin" ? user.domain : (parsed.data.domain ?? user.domain);
  try {
    const prompt = await saveTaskPrompt({ ...parsed.data, domain }, user);
    return NextResponse.json({ success: true, prompt });
  } catch (err) {
    if (err instanceof NotFoundError) return jsonError(err.message, 404);
    if (err instanceof ForbiddenError) return jsonError(err.message, 403);
    log.error("Saving a task failed", err);
    return jsonError("Could not save the task.", 500);
  }
}
