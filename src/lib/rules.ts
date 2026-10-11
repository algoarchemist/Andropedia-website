import type { ClubPosition, DomainType, RoleType } from "./types";

// Business rules as plain functions (no database), so they can be tested directly and reused by
// the data layer and the API routes.

// ---------------------------------------------------------------- task submissions

export type SubmitDecision =
  | { ok: true; action: "create" | "update" }
  | { ok: false; status: 404 | 409; error: string };

/**
 * A member may submit one task per week. While the week is open they can edit it; once it has
 * been graded it is locked. Closed weeks accept nothing.
 */
export function decideSubmission(
  week: { isActive: boolean } | null,
  existing: { status: "SUBMITTED" | "EVALUATED" } | null
): SubmitDecision {
  if (!week) return { ok: false, status: 404, error: "Sprint week not found" };
  if (!week.isActive) return { ok: false, status: 409, error: "Submissions for this week are closed." };
  if (existing?.status === "EVALUATED") {
    return { ok: false, status: 409, error: "This submission has already been graded and can no longer be edited." };
  }
  return { ok: true, action: existing ? "update" : "create" };
}

// ---------------------------------------------------------------- member management

export interface MemberPatch {
  name?: string;
  bio?: string;
  linkedin?: string;
  role?: RoleType;
  position?: ClubPosition;
  domain?: DomainType;
  isActive?: boolean;
}

/** Returns a reason the change is not allowed, or null if it is fine. */
export function checkMemberChange(args: {
  actorId: string;
  target: { id: string; role: RoleType; isActive: boolean };
  patch: MemberPatch;
  /** How many active super admins exist right now (including the target if it is one). */
  activeSuperAdmins: number;
}): string | null {
  const { actorId, target, patch, activeSuperAdmins } = args;
  if (Object.values(patch).every((v) => v === undefined)) return "Nothing to change.";

  const losesAdmin = patch.role !== undefined && patch.role !== target.role && target.role === "super_admin";
  const deactivating = patch.isActive === false && target.isActive;
  const changesOwnAccess = (patch.role !== undefined && patch.role !== target.role) || deactivating;

  if (target.id === actorId && changesOwnAccess) {
    return "You can't change your own role or deactivate your own account.";
  }
  if (target.role === "super_admin" && target.isActive && (losesAdmin || deactivating) && activeSuperAdmins <= 1) {
    return "At least one active super admin is required.";
  }
  return null;
}

/** Returns a reason the member can't be removed for good, or null if it is fine. */
export function checkMemberDelete(args: {
  actorId: string;
  target: { id: string; role: RoleType; isActive: boolean };
  activeSuperAdmins: number;
}): string | null {
  const { actorId, target, activeSuperAdmins } = args;
  if (target.id === actorId) return "You can't remove your own account.";
  if (target.role === "super_admin" && target.isActive && activeSuperAdmins <= 1) return "At least one active super admin is required.";
  return null;
}

// ---------------------------------------------------------------- sprint weeks

export function checkWeekDates(startDate: Date, endDate: Date): string | null {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "Enter valid start and end dates.";
  if (endDate.getTime() < startDate.getTime()) return "The end date must be on or after the start date.";
  return null;
}
