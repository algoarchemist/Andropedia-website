import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { evaluateTask, ForbiddenError, NotFoundError } from "@/lib/data-store";
import { sendGradedNotice } from "@/lib/graded-email";
import { readJson } from "@/lib/http";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const criterion = z.number().int().min(0).max(25);

const evaluationSchema = z
  .object({
    taskId: z.string().min(1),
    score: z.number().int("Score must be a whole number.").min(0).max(100, "Score must be between 0 and 100."),
    feedback: z.string().trim().min(1, "Feedback is required.").max(2000),
    criteriaScores: z
      .object({
        technicalDepth: criterion,
        innovation: criterion,
        completion: criterion,
        documentation: criterion,
      })
      .optional(),
  })
  .refine(
    (v) =>
      !v.criteriaScores ||
      v.criteriaScores.technicalDepth + v.criteriaScores.innovation + v.criteriaScores.completion + v.criteriaScores.documentation === v.score,
    { message: "Score must equal the sum of the four rubric scores.", path: ["score"] }
  );

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ["domain_admin", "super_admin"]);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const body = await readJson(request, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = evaluationSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid evaluation." },
      { status: 400 }
    );
  }

  try {
    const updatedTask = await evaluateTask({
      ...parsed.data,
      adminId: user.id, // the grader is always the logged-in user
      restrictToDomain: user.role === "domain_admin" ? user.domain : undefined,
    });
    if (!updatedTask) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }
    // Tell the member after the response goes out; a mail problem must never undo a grade.
    after(async () => {
      try {
        const member = await prisma.user.findUnique({ where: { id: updatedTask.userId }, select: { name: true, email: true } });
        if (member?.email) {
          await sendGradedNotice(member, { title: updatedTask.title, weekNumber: updatedTask.weekNumber }, { score: parsed.data.score, feedback: parsed.data.feedback });
        }
      } catch (err) {
        log.warn("Graded notice email failed", { taskId: updatedTask.id }, err);
      }
    });
    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    log.error("Evaluating a task failed", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
