import { describe, expect, it } from "vitest";
import { checkMemberChange, checkWeekDates, decideSubmission, decideTaskDelete, portalRole } from "@/lib/rules";

describe("decideSubmission", () => {
  it("creates a first submission in an open week", () => {
    expect(decideSubmission({ isActive: true }, null)).toEqual({ ok: true, action: "create" });
  });
  it("lets a member edit their submission while the week is open and it is not graded", () => {
    expect(decideSubmission({ isActive: true }, { status: "SUBMITTED" })).toEqual({ ok: true, action: "update" });
  });
  it("refuses a closed week", () => {
    expect(decideSubmission({ isActive: false }, null)).toMatchObject({ ok: false, status: 409 });
    expect(decideSubmission({ isActive: false }, { status: "SUBMITTED" })).toMatchObject({ ok: false, status: 409 });
  });
  it("locks a graded submission", () => {
    const d = decideSubmission({ isActive: true }, { status: "EVALUATED" });
    expect(d).toMatchObject({ ok: false, status: 409 });
    if (!d.ok) expect(d.error).toMatch(/already been graded/);
  });
  it("reports a missing week as 404", () => {
    expect(decideSubmission(null, null)).toMatchObject({ ok: false, status: 404 });
  });
});

describe("checkMemberChange", () => {
  const admin = { id: "root", role: "super_admin" as const, isActive: true };
  const member = { id: "m1", role: "member" as const, isActive: true };

  it("allows promoting a member", () => {
    expect(checkMemberChange({ actorId: "root", target: member, patch: { role: "domain_admin" }, activeSuperAdmins: 1 })).toBeNull();
  });
  it("rejects an empty change", () => {
    expect(checkMemberChange({ actorId: "root", target: member, patch: {}, activeSuperAdmins: 1 })).toMatch(/Nothing to change/);
  });
  it("blocks changing your own role or deactivating yourself", () => {
    expect(checkMemberChange({ actorId: "root", target: admin, patch: { role: "member" }, activeSuperAdmins: 3 })).toMatch(/your own/);
    expect(checkMemberChange({ actorId: "root", target: admin, patch: { isActive: false }, activeSuperAdmins: 3 })).toMatch(/your own/);
  });
  it("lets you change your own team position or domain", () => {
    expect(checkMemberChange({ actorId: "root", target: admin, patch: { position: "president" }, activeSuperAdmins: 1 })).toBeNull();
  });
  it("never removes the last active super admin", () => {
    expect(checkMemberChange({ actorId: "other", target: admin, patch: { role: "member" }, activeSuperAdmins: 1 })).toMatch(/At least one active super admin/);
    expect(checkMemberChange({ actorId: "other", target: admin, patch: { isActive: false }, activeSuperAdmins: 1 })).toMatch(/At least one active super admin/);
  });
  it("allows removing a super admin when another one remains", () => {
    expect(checkMemberChange({ actorId: "other", target: admin, patch: { role: "domain_admin" }, activeSuperAdmins: 2 })).toBeNull();
  });
  it("allows reactivating an inactive account", () => {
    expect(checkMemberChange({ actorId: "root", target: { ...member, isActive: false }, patch: { isActive: true }, activeSuperAdmins: 1 })).toBeNull();
  });
});

describe("checkWeekDates", () => {
  it("accepts a normal range and a single-day week", () => {
    expect(checkWeekDates(new Date("2026-10-01"), new Date("2026-10-08"))).toBeNull();
    expect(checkWeekDates(new Date("2026-10-01"), new Date("2026-10-01"))).toBeNull();
  });
  it("rejects an end before the start and invalid dates", () => {
    expect(checkWeekDates(new Date("2026-10-08"), new Date("2026-10-01"))).toMatch(/on or after/);
    expect(checkWeekDates(new Date("nope"), new Date("2026-10-01"))).toMatch(/valid/);
  });
});

describe("decideTaskDelete", () => {
  const task = { userId: "m1", domain: "Web" as const, status: "SUBMITTED" as const, weekIsActive: true };
  const member = { id: "m1", role: "member" as const, domain: "Web" as const };

  it("lets a member take back their own ungraded submission while the week is open", () => {
    expect(decideTaskDelete(member, task)).toEqual({ ok: true });
  });
  it("keeps a member out of someone else's submission", () => {
    expect(decideTaskDelete({ ...member, id: "m2" }, task)).toMatchObject({ ok: false, status: 403 });
  });
  it("won't let a member delete graded work or work in a closed week", () => {
    expect(decideTaskDelete(member, { ...task, status: "EVALUATED" })).toMatchObject({ ok: false, status: 409 });
    expect(decideTaskDelete(member, { ...task, weekIsActive: false })).toMatchObject({ ok: false, status: 409 });
  });
  it("lets the domain's leads and co-leads delete anything in that domain, graded or not", () => {
    const lead = { id: "l1", role: "domain_admin" as const, domain: "Web" as const };
    expect(decideTaskDelete(lead, { ...task, status: "EVALUATED", weekIsActive: false })).toEqual({ ok: true });
  });
  it("stops a lead reaching into another domain", () => {
    expect(decideTaskDelete({ id: "l1", role: "domain_admin", domain: "Design" }, task)).toMatchObject({ ok: false, status: 403 });
  });
  it("lets a super admin delete any submission", () => {
    expect(decideTaskDelete({ id: "s1", role: "super_admin", domain: "PR" }, { ...task, status: "EVALUATED" })).toEqual({ ok: true });
  });
});

describe("portalRole", () => {
  it("gives a Co-Lead member lead access", () => {
    expect(portalRole("member", "co_lead")).toBe("domain_admin");
  });
  it("leaves everyone else as they are", () => {
    expect(portalRole("member", "member")).toBe("member");
    expect(portalRole("member", "lead")).toBe("member");
    expect(portalRole("domain_admin", "co_lead")).toBe("domain_admin");
    expect(portalRole("super_admin", "co_lead")).toBe("super_admin");
    expect(portalRole("member", undefined)).toBe("member");
  });
});
