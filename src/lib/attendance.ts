import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { ConflictError, NotFoundError } from "./data-store";
import { heldOnDate, parseAttendanceCsv, todayInIndia, type CsvIdentifier, type SessionKind } from "./attendance-schema";

export interface AttendanceSessionInfo {
  id: string;
  kind: SessionKind;
  title: string;
  heldOn: string;
  hours: number | null;
  description: string | null;
  eventId: string | null;
  present: number;
}

export interface EventOption {
  id: string;
  title: string;
  startsAt: string;
  hasSession: boolean;
}

type DbKind = "EVENT" | "CLUB_HOUR" | "GMEET";
type DbSession = { id: string; kind: DbKind; title: string; heldOn: Date; hours: number | null; description: string | null; eventId: string | null; _count: { records: number } };

const KIND_FROM_DB: Record<DbKind, SessionKind> = { EVENT: "event", CLUB_HOUR: "club_hour", GMEET: "gmeet" };
const KIND_TO_DB: Record<SessionKind, DbKind> = { event: "EVENT", club_hour: "CLUB_HOUR", gmeet: "GMEET" };

const toInfo = (s: DbSession): AttendanceSessionInfo => ({
  id: s.id,
  kind: KIND_FROM_DB[s.kind],
  title: s.title,
  heldOn: s.heldOn.toISOString(),
  hours: s.hours,
  description: s.description,
  eventId: s.eventId,
  present: s._count.records,
});

const withCount = { _count: { select: { records: true } } } as const;

/** Sessions (newest first) and every event, so an event that has no session yet can still be picked. */
export async function listAttendanceSessions(): Promise<{ sessions: AttendanceSessionInfo[]; events: EventOption[] }> {
  const [sessions, events] = await Promise.all([
    prisma.attendanceSession.findMany({ orderBy: [{ heldOn: "desc" }, { createdAt: "desc" }], include: withCount }),
    prisma.event.findMany({ orderBy: { startsAt: "desc" }, select: { id: true, title: true, startsAt: true, attendance: { select: { id: true } } } }),
  ]);
  return {
    sessions: sessions.map(toInfo),
    events: events.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt.toISOString(), hasSession: !!e.attendance })),
  };
}

export type SessionInput =
  | { kind: "event"; eventId: string }
  | { kind: "club_hour" | "gmeet"; title: string; heldOn?: string; hours?: number; description?: string; count?: number };

/**
 * A new club hour or Google Meet, or the session of an event (created the first time, reused afterwards).
 * A count above 1 adds that many at once, named "<title> 1", "<title> 2", ... Returns the first one.
 */
export async function createAttendanceSession(actorId: string, input: SessionInput): Promise<AttendanceSessionInfo> {
  if (input.kind === "event") {
    const existing = await prisma.attendanceSession.findUnique({ where: { eventId: input.eventId }, include: withCount });
    if (existing) return toInfo(existing);
    const event = await prisma.event.findUnique({ where: { id: input.eventId }, select: { id: true, title: true, startsAt: true } });
    if (!event) throw new NotFoundError("Event not found.");
    const created = await prisma.attendanceSession.create({
      data: { kind: "EVENT", title: event.title, heldOn: event.startsAt, eventId: event.id, createdById: actorId },
      include: withCount,
    });
    await recordAudit({ actorId, action: "attendance.session.create", target: created.id, meta: { kind: "event", eventId: event.id } });
    return toInfo(created);
  }
  const count = input.count ?? 1;
  const heldOn = heldOnDate(input.heldOn ?? todayInIndia());
  let first: DbSession | null = null;
  for (let n = 1; n <= count; n++) {
    const created = await prisma.attendanceSession.create({
      data: {
        kind: KIND_TO_DB[input.kind],
        title: count > 1 ? `${input.title} ${n}` : input.title,
        heldOn,
        hours: input.hours ?? 1,
        description: input.description || null,
        createdById: actorId,
      },
      include: withCount,
    });
    first ??= created;
    await recordAudit({ actorId, action: "attendance.session.create", target: created.id, meta: { kind: input.kind, title: created.title } });
  }
  return toInfo(first!);
}

export interface SessionUpdate {
  title?: string;
  heldOn?: string;
  hours?: number | null;
  description?: string | null;
  kind?: "club_hour" | "gmeet";
}

/** Renames, re-dates or re-types a session without touching who was marked present. An event's session keeps its kind and has no hours. */
export async function updateAttendanceSession(actorId: string, sessionId: string, patch: SessionUpdate): Promise<AttendanceSessionInfo> {
  const existing = await prisma.attendanceSession.findUnique({ where: { id: sessionId }, select: { id: true, kind: true } });
  if (!existing) throw new NotFoundError("Attendance session not found.");
  if (existing.kind === "EVENT" && (patch.kind !== undefined || patch.hours !== undefined)) {
    throw new ConflictError("An event's session keeps its type and has no hours. Edit the name or date, or delete the session and start a Google Meet or club hour.");
  }
  const updated = await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.heldOn !== undefined ? { heldOn: heldOnDate(patch.heldOn) } : {}),
      ...(patch.hours !== undefined ? { hours: patch.hours } : {}),
      ...(patch.description !== undefined ? { description: patch.description || null } : {}),
      ...(patch.kind !== undefined ? { kind: KIND_TO_DB[patch.kind] } : {}),
    },
    include: withCount,
  });
  await recordAudit({ actorId, action: "attendance.session.update", target: sessionId, meta: { ...patch } });
  return toInfo(updated);
}

export async function getAttendance(sessionId: string): Promise<{ session: AttendanceSessionInfo; userIds: string[] }> {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId }, include: withCount });
  if (!session) throw new NotFoundError("Attendance session not found.");
  const records = await prisma.attendanceRecord.findMany({ where: { sessionId }, select: { userId: true } });
  return { session: toInfo(session), userIds: records.map((r) => r.userId) };
}

async function requireSession(sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) throw new NotFoundError("Attendance session not found.");
}

/** Marks the members present, or removes their mark. Safe to repeat. Returns how many records actually changed. */
export async function setPresence(actorId: string, sessionId: string, userIds: string[], present: boolean): Promise<{ changed: number }> {
  await requireSession(sessionId);
  const ids = [...new Set(userIds)];
  let changed = 0;
  if (present) {
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (users.length === 0) throw new NotFoundError("Member not found.");
    const result = await prisma.attendanceRecord.createMany({
      data: users.map((u) => ({ sessionId, userId: u.id, markedById: actorId })),
      skipDuplicates: true,
    });
    changed = result.count;
  } else {
    changed = (await prisma.attendanceRecord.deleteMany({ where: { sessionId, userId: { in: ids } } })).count;
  }
  if (changed > 0) await recordAudit({ actorId, action: present ? "attendance.mark" : "attendance.unmark", target: sessionId, meta: { count: changed, via: "manual" } });
  return { changed };
}

export interface ImportReport {
  rows: number;
  marked: number;
  alreadyMarked: number;
  duplicates: number;
  blankRows: number;
  /** Identifiers in the file that match no member (first 50). */
  notFound: string[];
  notFoundCount: number;
}

/** Marks every member named in the CSV present. Rows that match nobody are reported, not fatal. */
export async function importAttendanceCsv(actorId: string, sessionId: string, csv: string): Promise<ImportReport> {
  await requireSession(sessionId);
  const parsed = parseAttendanceCsv(csv);
  if (!parsed.ok) throw new ConflictError(parsed.error);

  const regs = [...new Set(parsed.identifiers.filter((i) => i.kind === "registerNo").map((i) => i.value))];
  const emails = [...new Set(parsed.identifiers.filter((i) => i.kind === "email").map((i) => i.value))];
  const users = await prisma.user.findMany({
    where: { OR: [...(regs.length ? [{ registerNo: { in: regs } }] : []), ...(emails.length ? [{ email: { in: emails } }] : [])] },
    select: { id: true, email: true, registerNo: true },
  });
  const byReg = new Map(users.filter((u) => u.registerNo).map((u) => [u.registerNo!.toUpperCase(), u.id]));
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

  const matched = new Set<string>();
  const missing = new Set<string>();
  let duplicates = 0;
  const lookup = (i: CsvIdentifier) => (i.kind === "registerNo" ? byReg.get(i.value) : byEmail.get(i.value));
  for (const identifier of parsed.identifiers) {
    const id = lookup(identifier);
    if (!id) missing.add(identifier.value);
    else if (matched.has(id)) duplicates++;
    else matched.add(id);
  }

  let marked = 0;
  if (matched.size > 0) {
    const result = await prisma.attendanceRecord.createMany({
      data: [...matched].map((userId) => ({ sessionId, userId, markedById: actorId })),
      skipDuplicates: true,
    });
    marked = result.count;
  }
  const report: ImportReport = {
    rows: parsed.identifiers.length + parsed.blankRows,
    marked,
    alreadyMarked: matched.size - marked,
    duplicates,
    blankRows: parsed.blankRows,
    notFound: [...missing].slice(0, 50),
    notFoundCount: missing.size,
  };
  await recordAudit({ actorId, action: "attendance.import", target: sessionId, meta: { marked, notFound: report.notFoundCount, rows: report.rows } });
  return report;
}

export async function deleteAttendanceSession(actorId: string, sessionId: string): Promise<void> {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId }, select: { id: true, title: true } });
  if (!session) throw new NotFoundError("Attendance session not found.");
  await prisma.attendanceSession.delete({ where: { id: sessionId } });
  await recordAudit({ actorId, action: "attendance.session.delete", target: sessionId, meta: { title: session.title } });
}

export interface MemberAttendance {
  attended: Array<{ id: string; kind: SessionKind; title: string; heldOn: string; hours: number | null; description: string | null }>;
  /** Sessions held so far (events and club hours), whether or not this member was there. */
  sessionsHeld: number;
  /** How many of those this member was at. A session marked ahead of its date is listed in `attended` but not counted here yet. */
  attendedCount: number;
  /** Club hours across the sessions this member attended. */
  clubHours: number;
}

/** The sessions a member was marked present at (events, club hours and Google Meets), newest first, with how many were held in all. */
export async function getMemberAttendance(userId: string, now: Date = new Date()): Promise<MemberAttendance> {
  const [records, sessionsHeld] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { userId },
      include: { session: { select: { id: true, kind: true, title: true, heldOn: true, hours: true, description: true } } },
    }),
    prisma.attendanceSession.count({ where: { heldOn: { lte: now } } }),
  ]);
  const attended = records
    .map((r) => r.session)
    .sort((a, b) => b.heldOn.getTime() - a.heldOn.getTime())
    .map((s) => ({ id: s.id, kind: KIND_FROM_DB[s.kind], title: s.title, heldOn: s.heldOn.toISOString(), hours: s.hours, description: s.description }));
  const clubHours = attended.reduce((sum, s) => sum + (s.kind === "club_hour" ? (s.hours ?? 0) : 0), 0);
  const attendedCount = attended.filter((s) => new Date(s.heldOn).getTime() <= now.getTime()).length;
  return { attended, sessionsHeld, attendedCount, clubHours };
}
