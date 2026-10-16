import { recordAudit } from "./audit";
import { DOMAIN_FROM_DB, ForbiddenError, NotFoundError, toDbDomain } from "./data-store";
import { prisma } from "./prisma";
import type { DomainType, RoleType } from "./types";

// Messages a lead posts for their domain's members, shown on the member dashboard. A super admin can also post to everyone.

export const MAX_ANNOUNCEMENTS_SHOWN = 30;

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** The domain it is for, or "All" for everyone. */
  domain: DomainType | "All";
  authorName: string;
  createdAt: string;
  /** Posted by someone else and not opened on the dashboard yet. */
  isNew: boolean;
  canDelete: boolean;
}

export interface Viewer {
  id: string;
  role: RoleType;
  domain: DomainType;
}

/** A lead's announcements always go to their own domain. Only a super admin chooses a domain, or everyone. */
export function targetDomain(viewer: Viewer, requested: DomainType | "All" | undefined): DomainType | "All" {
  if (viewer.role === "super_admin") return requested ?? viewer.domain;
  return viewer.domain;
}

export const canDeleteAnnouncement = (viewer: Viewer, domain: DomainType | "All") =>
  viewer.role === "super_admin" || (viewer.role === "domain_admin" && domain === viewer.domain);

/** Newest first. A member gets their own domain's messages and the ones for everyone; a super admin gets every message. */
export async function listAnnouncements(viewer: Viewer): Promise<Announcement[]> {
  const where = viewer.role === "super_admin" ? {} : { OR: [{ domain: null }, { domain: toDbDomain(viewer.domain) }] };
  const rows = await prisma.announcement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_ANNOUNCEMENTS_SHOWN,
    include: { reads: { where: { userId: viewer.id }, select: { userId: true } } },
  });
  const authors = rows.length
    ? await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.authorId))] } }, select: { id: true, name: true } })
    : [];
  const names = new Map(authors.map((u) => [u.id, u.name]));
  return rows.map((r) => {
    const domain = r.domain ? DOMAIN_FROM_DB[r.domain] : "All";
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      domain,
      authorName: names.get(r.authorId) ?? "A club lead",
      createdAt: r.createdAt.toISOString(),
      isNew: r.reads.length === 0 && r.authorId !== viewer.id,
      canDelete: canDeleteAnnouncement(viewer, domain),
    };
  });
}

export async function createAnnouncement(
  viewer: Viewer,
  input: { title: string; body: string; domain?: DomainType | "All" },
): Promise<void> {
  if (viewer.role !== "domain_admin" && viewer.role !== "super_admin") throw new ForbiddenError("Only leads can post announcements.");
  const domain = targetDomain(viewer, input.domain);
  const created = await prisma.announcement.create({
    data: { title: input.title, body: input.body, authorId: viewer.id, domain: domain === "All" ? null : toDbDomain(domain) },
  });
  await recordAudit({ actorId: viewer.id, action: "announcement.create", target: created.id, meta: { domain } });
}

export async function deleteAnnouncement(viewer: Viewer, id: string): Promise<void> {
  const row = await prisma.announcement.findUnique({ where: { id }, select: { id: true, domain: true } });
  if (!row) throw new NotFoundError("Announcement not found.");
  const domain = row.domain ? DOMAIN_FROM_DB[row.domain] : "All";
  if (!canDeleteAnnouncement(viewer, domain)) throw new ForbiddenError("You can remove only your own domain's announcements.");
  await prisma.announcement.delete({ where: { id } });
  await recordAudit({ actorId: viewer.id, action: "announcement.delete", target: id, meta: { domain } });
}

/** Marks messages as seen by this member. Ids that are not visible to them, or do not exist, are ignored. */
export async function markAnnouncementsRead(viewer: Viewer, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const visible = await prisma.announcement.findMany({
    where: { id: { in: ids }, ...(viewer.role === "super_admin" ? {} : { OR: [{ domain: null }, { domain: toDbDomain(viewer.domain) }] }) },
    select: { id: true },
  });
  if (visible.length === 0) return;
  await prisma.announcementRead.createMany({ data: visible.map((a) => ({ userId: viewer.id, announcementId: a.id })), skipDuplicates: true });
}
