import type { Prisma } from "@prisma/client";
import { hashPassword, normalizeRegisterNo } from "./password";
import { prisma } from "./prisma";
import {
  User, Week, Task, Evaluation, LeaderboardEntry, DomainType, RoleType, ClubPosition,
} from "./types";
import { recordAudit } from "./audit";
import { computeLeaderboard, type BoardPeriod } from "./leaderboard";
import { checkMemberChange, checkMemberDelete, checkWeekDates, decideSubmission, type MemberPatch } from "./rules";
import { memberPhotoUrl } from "./member-profile";

// Database-backed data layer. Return shapes match the types in ./types so the
// pages and API responses are unchanged; Prisma enums are mapped at the edge.

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
/** The request is valid but conflicts with the current state (closed week, duplicate, locked). */
export class ConflictError extends Error {}

const DOMAIN_TO_DB = {
  Technical: "TECHNICAL", Web: "WEB", PR: "PR", "R&D": "RD", Design: "DESIGN", Media: "MEDIA",
} as const;
const DOMAIN_FROM_DB: Record<string, DomainType> = {
  TECHNICAL: "Technical", WEB: "Web", PR: "PR", RD: "R&D", DESIGN: "Design", MEDIA: "Media",
};
const ROLE_FROM_DB: Record<string, RoleType> = {
  MEMBER: "member", DOMAIN_ADMIN: "domain_admin", SUPER_ADMIN: "super_admin",
};
const ROLE_TO_DB = { member: "MEMBER", domain_admin: "DOMAIN_ADMIN", super_admin: "SUPER_ADMIN" } as const;

const POSITION_FROM_DB: Record<string, ClubPosition> = {
  PRESIDENT: "president", VICE_PRESIDENT: "vice_president", CHIEF: "chief",
  LEAD: "lead", CO_LEAD: "co_lead", MEMBER: "member",
};
export const toDbPosition = (p: string) => {
  const key = p.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return key in POSITION_FROM_DB ? (key as "PRESIDENT" | "VICE_PRESIDENT" | "CHIEF" | "LEAD" | "CO_LEAD" | "MEMBER") : undefined;
};

export const toDbDomain = (d: string) => DOMAIN_TO_DB[d as DomainType] as (typeof DOMAIN_TO_DB)[DomainType] | undefined;

type DbUser = Prisma.UserGetPayload<object>;
type DbWeek = Prisma.WeekGetPayload<object>;
type DbTask = Prisma.TaskGetPayload<{
  include: { user: true; week: true; evaluation: { include: { admin: true } } };
}>;

const taskInclude = { user: true, week: true, evaluation: { include: { admin: true } } } as const;

export function mapUser(u: DbUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: ROLE_FROM_DB[u.role],
    domain: DOMAIN_FROM_DB[u.domain],
    avatar: u.avatar ?? "",
    bio: u.bio ?? undefined,
    github: u.github ?? undefined,
    linkedin: u.linkedin ?? undefined,
    instagram: u.instagram ?? undefined,
    portfolio: u.portfolio ?? undefined,
    points: u.points,
    tasksCompleted: u.tasksCompleted,
    streakWeeks: u.streakWeeks,
    isActive: u.isActive,
    position: POSITION_FROM_DB[u.position],
    mustChangePassword: u.mustChangePassword,
  };
}

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

function mapWeek(w: DbWeek): Week {
  return {
    id: w.id,
    weekNumber: w.weekNumber,
    title: w.title,
    theme: w.theme,
    startDate: dateOnly(w.startDate),
    endDate: dateOnly(w.endDate),
    isActive: w.isActive,
    promptDescription: w.promptDescription ?? undefined,
  };
}

function mapTask(t: DbTask): Task {
  const e = t.evaluation;
  const evaluation: Evaluation | undefined = e
    ? {
        id: e.id,
        taskId: e.taskId,
        adminId: e.adminId,
        adminName: e.admin.name,
        score: e.score,
        criteriaScores:
          e.technicalDepth != null && e.innovation != null && e.completion != null && e.documentation != null
            ? {
                technicalDepth: e.technicalDepth,
                innovation: e.innovation,
                completion: e.completion,
                documentation: e.documentation,
              }
            : undefined,
        feedback: e.feedback,
        evaluatedAt: e.evaluatedAt.toISOString(),
      }
    : undefined;

  return {
    id: t.id,
    userId: t.userId,
    userName: t.user.name,
    userAvatar: t.user.avatar ?? "",
    domain: DOMAIN_FROM_DB[t.domain],
    weekId: t.weekId,
    weekNumber: t.week.weekNumber,
    title: t.title,
    description: t.description,
    githubUrl: t.githubUrl ?? undefined,
    liveUrl: t.liveUrl ?? undefined,
    figmaUrl: t.figmaUrl ?? undefined,
    notes: t.notes ?? undefined,
    status: t.status === "EVALUATED" ? "evaluated" : "submitted",
    submittedAt: t.submittedAt.toISOString(),
    evaluation,
  };
}

export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return users.map(mapUser);
}

/** Public profile fields only: never exposes email or account status. */
export type PublicMember = Omit<User, "email" | "isActive" | "mustChangePassword">;

export async function getPublicMembers(): Promise<PublicMember[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return users.map((u) => {
    const { email: _email, isActive: _isActive, mustChangePassword: _mustChange, ...publicFields } = mapUser(u);
    void _email;
    void _isActive;
    void _mustChange;
    return publicFields;
  });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  return user ? mapUser(user) : null;
}

export async function getWeeks(): Promise<Week[]> {
  const weeks = await prisma.week.findMany({ orderBy: { weekNumber: "asc" } });
  return weeks.map(mapWeek);
}

export interface TaskFilters {
  weekId?: string | null;
  domain?: string | null;
  userId?: string | null;
  status?: string | null;
}

export async function getTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const where: Prisma.TaskWhereInput = {};
  if (filters.weekId && filters.weekId !== "all") where.weekId = filters.weekId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.domain && filters.domain !== "All") {
    const match = Object.entries(DOMAIN_TO_DB).find(([name]) => name.toLowerCase() === filters.domain!.toLowerCase());
    if (!match) return [];
    where.domain = match[1];
  }
  if (filters.status) {
    const status = filters.status.toLowerCase();
    if (status !== "submitted" && status !== "evaluated") return [];
    where.status = status === "evaluated" ? "EVALUATED" : "SUBMITTED";
  }
  const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: { submittedAt: "desc" } });
  return tasks.map(mapTask);
}

export interface NewTask {
  userId: string;
  weekId: string;
  domain: DomainType;
  title: string;
  description: string;
  githubUrl?: string;
  liveUrl?: string;
  figmaUrl?: string;
  notes?: string;
}

/**
 * One submission per member per week. While the week is open it can be edited; once graded it is
 * locked; closed weeks accept nothing. Returns whether a new task was created or an existing one updated.
 */
export async function submitTask(taskData: NewTask): Promise<{ task: Task; created: boolean }> {
  const domain = toDbDomain(taskData.domain);
  if (!domain) throw new NotFoundError(`Unknown domain: ${taskData.domain}`);

  const [user, week, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: taskData.userId }, select: { id: true } }),
    prisma.week.findUnique({ where: { id: taskData.weekId }, select: { isActive: true } }),
    prisma.task.findUnique({
      where: { userId_weekId: { userId: taskData.userId, weekId: taskData.weekId } },
      select: { id: true, status: true },
    }),
  ]);
  if (!user) throw new NotFoundError("Member account not found");

  const decision = decideSubmission(week, existing);
  if (!decision.ok) {
    throw decision.status === 404 ? new NotFoundError(decision.error) : new ConflictError(decision.error);
  }

  const fields = {
    domain,
    title: taskData.title,
    description: taskData.description,
    githubUrl: taskData.githubUrl || null,
    liveUrl: taskData.liveUrl || null,
    figmaUrl: taskData.figmaUrl || null,
    notes: taskData.notes || null,
  };

  try {
    const saved =
      decision.action === "update" && existing
        ? await prisma.task.update({ where: { id: existing.id }, data: fields, include: taskInclude })
        : await prisma.task.create({ data: { userId: taskData.userId, weekId: taskData.weekId, ...fields }, include: taskInclude });
    return { task: mapTask(saved), created: decision.action === "create" };
  } catch (err) {
    // Two simultaneous first submissions: the unique (userId, weekId) rule rejects the second.
    if ((err as { code?: string }).code === "P2002") {
      throw new ConflictError("You already submitted for this week. Refresh and edit your submission instead.");
    }
    throw err;
  }
}

export interface EvaluationInput {
  taskId: string;
  adminId: string;
  score: number;
  feedback: string;
  criteriaScores?: Evaluation["criteriaScores"];
  /** Domain leads may only grade tasks from their own domain. */
  restrictToDomain?: DomainType;
}

export async function evaluateTask({
  taskId, adminId, score, feedback, criteriaScores, restrictToDomain,
}: EvaluationInput): Promise<Task | null> {
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true } });
  if (!admin) throw new NotFoundError("Evaluator account not found");

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId }, include: { evaluation: true } });
    if (!task) return null;
    if (task.userId === adminId) throw new ForbiddenError("You cannot grade your own submission");
    if (restrictToDomain && task.domain !== toDbDomain(restrictToDomain)) {
      throw new ForbiddenError("You can only grade submissions from your own domain");
    }

    const previous = task.evaluation;
    const fields = {
      adminId,
      score,
      feedback,
      technicalDepth: criteriaScores?.technicalDepth ?? null,
      innovation: criteriaScores?.innovation ?? null,
      completion: criteriaScores?.completion ?? null,
      documentation: criteriaScores?.documentation ?? null,
      evaluatedAt: new Date(),
    };
    await tx.evaluation.upsert({
      where: { taskId },
      create: { taskId, ...fields },
      update: fields,
    });
    await tx.task.update({ where: { id: taskId }, data: { status: "EVALUATED" } });

    // Re-grading adjusts points by the difference instead of adding the score again.
    await tx.user.update({
      where: { id: task.userId },
      data: {
        points: { increment: score - (previous?.score ?? 0) },
        ...(previous ? {} : { tasksCompleted: { increment: 1 } }),
      },
    });

    await recordAudit(
      { actorId: adminId, action: previous ? "evaluation.update" : "evaluation.create", target: taskId, meta: { score, previousScore: previous?.score ?? null, memberId: task.userId } },
      tx
    );

    const updated = await tx.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
    return mapTask(updated);
  });
}

export async function getLeaderboard(domain?: string, period?: string): Promise<LeaderboardEntry[]> {
  const domainFilter = !domain || domain === "All" ? "All" : (Object.values(DOMAIN_FROM_DB).find((d) => d === domain) ?? null);
  if (domainFilter === null) return []; // unknown domain -> no results

  const [users, evaluations, activeWeek] = await Promise.all([
    prisma.user.findMany({ where: { role: "MEMBER", isActive: true }, select: { id: true, name: true, avatar: true, domain: true } }),
    prisma.evaluation.findMany({
      select: { score: true, evaluatedAt: true, task: { select: { userId: true, weekId: true, week: { select: { weekNumber: true } } } } },
    }),
    prisma.week.findFirst({ where: { isActive: true }, select: { id: true } }),
  ]);

  return computeLeaderboard(
    {
      users: users.map((u) => ({ id: u.id, name: u.name, avatar: u.avatar ?? "", domain: DOMAIN_FROM_DB[u.domain] })),
      evaluations: evaluations.map((e) => ({
        userId: e.task.userId,
        weekId: e.task.weekId,
        weekNumber: e.task.week.weekNumber,
        score: e.score,
        evaluatedAt: e.evaluatedAt,
      })),
      activeWeekId: activeWeek?.id ?? null,
    },
    domainFilter,
    (period === "weekly" || period === "monthly" ? period : "all-time") as BoardPeriod
  );
}

// ---------------------------------------------------------------- sprint weeks (super admin)

export interface WeekInput {
  weekNumber?: number;
  title?: string;
  theme?: string;
  startDate?: string;
  endDate?: string;
  promptDescription?: string | null;
  isActive?: boolean;
}

export async function createWeek(
  input: Required<Pick<WeekInput, "weekNumber" | "title" | "theme" | "startDate" | "endDate">> & Pick<WeekInput, "promptDescription" | "isActive">,
  actorId: string
): Promise<Week> {
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  const problem = checkWeekDates(start, end);
  if (problem) throw new ConflictError(problem);

  try {
    const week = await prisma.$transaction(async (tx) => {
      if (input.isActive) await tx.week.updateMany({ where: { isActive: true }, data: { isActive: false } });
      const created = await tx.week.create({
        data: {
          weekNumber: input.weekNumber, title: input.title, theme: input.theme, startDate: start, endDate: end,
          promptDescription: input.promptDescription ?? null, isActive: input.isActive ?? false,
        },
      });
      await recordAudit({ actorId, action: "week.create", target: created.id, meta: { weekNumber: created.weekNumber, isActive: created.isActive } }, tx);
      return created;
    });
    return mapWeek(week);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") throw new ConflictError(`Week ${input.weekNumber} already exists.`);
    throw err;
  }
}

/** Edits a week. Opening a week closes any other open week, so only one is ever open. */
export async function updateWeek(id: string, patch: WeekInput, actorId: string): Promise<Week> {
  const current = await prisma.week.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("Sprint week not found");

  const start = patch.startDate ? new Date(patch.startDate) : current.startDate;
  const end = patch.endDate ? new Date(patch.endDate) : current.endDate;
  const problem = checkWeekDates(start, end);
  if (problem) throw new ConflictError(problem);

  try {
    const week = await prisma.$transaction(async (tx) => {
      if (patch.isActive) await tx.week.updateMany({ where: { isActive: true, NOT: { id } }, data: { isActive: false } });
      const updated = await tx.week.update({
        where: { id },
        data: {
          ...(patch.weekNumber !== undefined ? { weekNumber: patch.weekNumber } : {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
          ...(patch.promptDescription !== undefined ? { promptDescription: patch.promptDescription } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          startDate: start,
          endDate: end,
        },
      });
      await recordAudit({ actorId, action: "week.update", target: id, meta: { changed: Object.keys(patch), isActive: updated.isActive } }, tx);
      return updated;
    });
    return mapWeek(week);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") throw new ConflictError(`Week ${patch.weekNumber} already exists.`);
    throw err;
  }
}

// ---------------------------------------------------------------- member management (super admin)

export interface NewMember {
  name: string;
  email: string;
  /** Login username; the starting password is the same value. */
  registerNo: string;
  domain: DomainType;
  role?: RoleType;
  position?: ClubPosition;
  bio?: string;
  /** Already cleaned by `normalizeLinkedin`; "" means none. */
  linkedin?: string;
}

/** Adds a member who can log in with their register number (password = register number). Email and register number must be new. */
export async function createMember(actorId: string, input: NewMember): Promise<User> {
  const domain = toDbDomain(input.domain);
  const position = toDbPosition(input.position ?? "member");
  if (!domain || !position) throw new NotFoundError("Unknown position or domain");
  const email = input.email.trim().toLowerCase();
  const registerNo = normalizeRegisterNo(input.registerNo);
  const clash = await prisma.user.findFirst({ where: { OR: [{ email }, { registerNo }] }, select: { email: true } });
  if (clash) throw new ConflictError(clash.email === email ? "A member with this email already exists." : "A member with this register number already exists.");
  try {
    const created = await prisma.user.create({
      data: { name: input.name.trim(), email, registerNo, passwordHash: hashPassword(registerNo), mustChangePassword: true, domain, position, role: ROLE_TO_DB[input.role ?? "member"], bio: input.bio?.trim() || null, linkedin: input.linkedin || null },
    });
    await recordAudit({ actorId, action: "member.create", target: created.id, meta: { role: input.role ?? "member", domain: input.domain } });
    return mapUser(created);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") throw new ConflictError("A member with this email or register number already exists.");
    throw err;
  }
}

/** Changes a member's permission role, team position, domain or active status, with safety rules. */
export async function updateMember(actorId: string, id: string, patch: MemberPatch): Promise<User> {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("Member not found");

  const activeSuperAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
  const reason = checkMemberChange({
    actorId,
    target: { id: target.id, role: ROLE_FROM_DB[target.role], isActive: target.isActive },
    patch,
    activeSuperAdmins,
  });
  if (reason) throw new ForbiddenError(reason);

  const position = patch.position ? toDbPosition(patch.position) : undefined;
  const domain = patch.domain ? toDbDomain(patch.domain) : undefined;
  if ((patch.position && !position) || (patch.domain && !domain)) throw new NotFoundError("Unknown position or domain");

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.bio !== undefined ? { bio: patch.bio.trim() || null } : {}),
        ...(patch.linkedin !== undefined ? { linkedin: patch.linkedin || null } : {}),
        ...(patch.role ? { role: ROLE_TO_DB[patch.role] } : {}),
        ...(position ? { position } : {}),
        ...(domain ? { domain } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      },
    });
    if (patch.isActive === false) await tx.session.deleteMany({ where: { userId: id } }); // sign them out everywhere
    await recordAudit(
      {
        actorId, action: "member.update", target: id,
        meta: { before: { role: ROLE_FROM_DB[target.role], position: POSITION_FROM_DB[target.position], domain: DOMAIN_FROM_DB[target.domain], isActive: target.isActive }, patch },
      },
      tx
    );
    return user;
  });
  return mapUser(updated);
}

/** Removes a member and everything tied to them (sessions, submissions, photo). Someone who has graded work can only be deactivated. */
export async function deleteMember(actorId: string, id: string): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("Member not found");
  const activeSuperAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true } });
  const reason = checkMemberDelete({ actorId, target: { id: target.id, role: ROLE_FROM_DB[target.role], isActive: target.isActive }, activeSuperAdmins });
  if (reason) throw new ForbiddenError(reason);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
      await recordAudit({ actorId, action: "member.delete", target: id, meta: { name: target.name, domain: DOMAIN_FROM_DB[target.domain], role: ROLE_FROM_DB[target.role] } }, tx);
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2003") throw new ConflictError("This member has graded other people's work, so they can't be deleted. Deactivate them instead.");
    throw err;
  }
}

/** Saves a member's uploaded picture and points their avatar at it. */
export async function setMemberPhoto(actorId: string, id: string, photo: { mime: string; data: Uint8Array }): Promise<User> {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw new NotFoundError("Member not found");
  const bytes = Buffer.from(photo.data);
  const user = await prisma.$transaction(async (tx) => {
    await tx.memberPhoto.upsert({ where: { userId: id }, create: { userId: id, mime: photo.mime, data: bytes }, update: { mime: photo.mime, data: bytes } });
    const updated = await tx.user.update({ where: { id }, data: { avatar: memberPhotoUrl(id) } });
    await recordAudit({ actorId, action: "member.photo", target: id, meta: { bytes: bytes.length } }, tx);
    return updated;
  });
  return mapUser(user);
}

/** Deletes a member's uploaded picture (their avatar goes back to the initials placeholder). */
export async function removeMemberPhoto(actorId: string, id: string): Promise<User> {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw new NotFoundError("Member not found");
  const user = await prisma.$transaction(async (tx) => {
    await tx.memberPhoto.deleteMany({ where: { userId: id } });
    const updated = await tx.user.update({ where: { id }, data: { avatar: null } });
    await recordAudit({ actorId, action: "member.photo.remove", target: id }, tx);
    return updated;
  });
  return mapUser(user);
}

export async function getMemberPhoto(id: string): Promise<{ mime: string; data: Uint8Array } | null> {
  const photo = await prisma.memberPhoto.findUnique({ where: { userId: id } });
  return photo ? { mime: photo.mime, data: photo.data } : null;
}
