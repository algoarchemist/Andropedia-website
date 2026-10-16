"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Pencil,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserPlus,
} from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { useAuth } from "@/lib/auth-context";
import { Week, User, ClubPosition, RoleType } from "@/lib/types";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { EventsAdmin } from "@/components/portal/EventsAdmin";
import { ProjectsAdmin } from "@/components/portal/ProjectsAdmin";
import { AuditAdmin } from "@/components/portal/AuditAdmin";
import { WeekCreate } from "@/components/portal/WeekCreate";
import { MemberAvatar, MemberEditor } from "@/components/portal/MemberEditor";
import { AttendancePanel, useAttendance } from "@/components/portal/AttendancePanel";

const POSITION_OPTIONS: Array<[ClubPosition, string]> = [
  ["member", "Member"],
  ["co_lead", "Co-Lead"],
  ["lead", "Lead"],
  ["chief", "Chief"],
  ["vice_president", "Vice President"],
  ["president", "President"],
];
const ROLE_OPTIONS: Array<[RoleType, string]> = [
  ["member", "Member"],
  ["domain_admin", "Domain lead (can grade)"],
  ["super_admin", "Super admin"],
];

export default function AdminPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  // "new" opens the add form; a member opens the edit form; null shows neither.
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const attendance = useAttendance(!authLoading && currentUser?.role === "super_admin");

  const loadData = async () => {
    try {
      const [resWeeks, resMembers] = await Promise.all([fetch("/api/weeks", { cache: "no-store" }), fetch("/api/admin/members", { cache: "no-store" })]);
      const [dataWeeks, dataMembers] = await Promise.all([resWeeks.json(), resMembers.json()]);

      if (dataWeeks.success) setWeeks(dataWeeks.weeks);
      if (dataMembers.success) setMembers(dataMembers.members);
    } catch (err) {
      console.error("Admin data load error:", err);
    }
  };

  useEffect(() => {
    if (authLoading || currentUser?.role !== "super_admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [authLoading, currentUser]);

  const request = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.error || "Something went wrong. Please try again.");
    return data;
  };

  // Open or close a week. The server keeps only one week open at a time, so reload the list.
  const setWeekOpen = async (week: Week) => {
    setBusyId(week.id);
    setNotice(null);
    try {
      await request(`/api/admin/weeks/${week.id}`, { isActive: !week.isActive });
      const res = await fetch("/api/weeks", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setWeeks(data.weeks);
      setNotice({ type: "success", text: `Week ${week.weekNumber} is now ${week.isActive ? "closed" : "open"}.` });
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Could not update the week." });
    } finally {
      setBusyId(null);
    }
  };

  const changeMember = async (member: User, patch: { role?: RoleType; position?: ClubPosition; isActive?: boolean }) => {
    setBusyId(member.id);
    setNotice(null);
    try {
      const data = await request(`/api/admin/members/${member.id}`, patch);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, ...data.member } : m)));
      setNotice({ type: "success", text: `Updated ${member.name}.` });
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Could not update the member." });
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (member: User) => {
    setBusyId(member.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not remove the member.");
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setNotice({ type: "success", text: `${member.name} was removed.` });
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Could not remove the member." });
    } finally {
      setBusyId(null);
      setConfirmRemoveId(null);
    }
  };

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => `${m.name} ${m.email} ${m.domain} ${m.role} ${m.position ?? ""}`.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <PortalAccessGate allowedRoles={["super_admin"]}>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-sky-400/10 pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-violet-300">
                <ShieldAlert className="h-3.5 w-3.5" />
                Super admin console
              </div>
              <h1 className="text-3xl font-black text-white">Club governance & sprint ops</h1>
              <p className="mt-2 text-xs text-slate-400">Open or close weekly sprint windows and audit member roles and submissions.</p>
            </div>

            <span className="inline-flex items-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
              System health: optimal
            </span>
          </div>

          {notice && (
            <p
              role={notice.type === "error" ? "alert" : "status"}
              className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}
            >
              {notice.text}
            </p>
          )}

          <div className="rounded-[28px] border border-sky-400/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.45)] sm:p-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Sprint cycles</h2>
                <p className="mt-1 text-xs text-slate-400">Open or close a sprint week. Only one week is open at a time; members can submit only to the open week.</p>
              </div>
              <WeekCreate
                nextNumber={weeks.reduce((max, w) => Math.max(max, w.weekNumber), 0) + 1}
                onCreated={(text) => {
                  setNotice({ type: "success", text });
                  void loadData();
                }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {weeks.map((week) => (
                <div key={week.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">Week {week.weekNumber}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-mono ${week.isActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
                        {week.isActive ? "Open" : "Closed"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{week.title}</h3>
                    <p className="mt-1 text-[11px] text-slate-400">Theme: {week.theme}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWeekOpen(week)}
                    disabled={busyId === week.id}
                    className="rounded-xl border border-white/10 bg-slate-900 p-2 transition-colors hover:border-cyan-400/30 disabled:opacity-50"
                    title={week.isActive ? "Close this week" : "Open this week"}
                    aria-label={`${week.isActive ? "Close" : "Open"} week ${week.weekNumber}`}
                    aria-pressed={week.isActive}
                  >
                    {week.isActive ? <ToggleRight className="h-8 w-8 text-emerald-400" /> : <ToggleLeft className="h-8 w-8 text-slate-600" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(2,6,23,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Member roster & roles ({visibleMembers.length}{visibleMembers.length !== members.length ? ` of ${members.length}` : ""})</h2>
              <div className="flex items-center gap-4">
                <label className="sr-only" htmlFor="member-search">Search members</label>
                <input
                  id="member-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email, domain..."
                  className="w-56 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none"
                />
                <Link href="/team" className="text-xs font-semibold text-emerald-300">
                  Public directory →
                </Link>
              </div>
            </div>

            {editing === null ? (
              <div className="border-b border-white/10 px-6 py-3">
                <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40">
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add member
                </button>
              </div>
            ) : (
              <MemberEditor
                key={editing === "new" ? "new" : editing.id}
                member={editing === "new" ? undefined : editing}
                onCancel={() => setEditing(null)}
                onSaved={(saved, text, tone = "success") => {
                  setMembers((prev) => (prev.some((m) => m.id === saved.id) ? prev.map((m) => (m.id === saved.id ? { ...m, ...saved } : m)) : [...prev, saved]));
                  setNotice({ type: tone, text });
                  setEditing(null);
                }}
              />
            )}

            <AttendancePanel attendance={attendance} visibleIds={visibleMembers.map((m) => m.id)} />

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-white/[0.02] text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    {attendance.selected && <th className="px-6 py-4">Present</th>}
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-6 py-4">Team position</th>
                    <th className="px-6 py-4">Portal role</th>
                    <th className="px-6 py-4">Active</th>
                    <th className="px-6 py-4 text-right">Points</th>
                    <th className="px-6 py-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-white/[0.02]">
                      {attendance.selected && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={attendance.present.has(member.id)}
                            onChange={() => void attendance.toggle(member.id)}
                            aria-label={`${member.name} present at ${attendance.selected.title}`}
                            className="h-4 w-4 cursor-pointer accent-emerald-400"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={member} />
                          <span className="font-bold text-white">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400">{member.email}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-slate-300">{member.domain}</span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          aria-label={`Team position for ${member.name}`}
                          value={member.position ?? "member"}
                          disabled={busyId === member.id}
                          onChange={(e) => changeMember(member, { position: e.target.value as ClubPosition })}
                          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                        >
                          {POSITION_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          aria-label={`Portal role for ${member.name}`}
                          value={member.role}
                          disabled={busyId === member.id}
                          onChange={(e) => changeMember(member, { role: e.target.value as RoleType })}
                          className="rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={member.isActive !== false}
                          aria-label={`${member.isActive === false ? "Reactivate" : "Deactivate"} ${member.name}`}
                          disabled={busyId === member.id}
                          onClick={() => changeMember(member, { isActive: member.isActive === false })}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${member.isActive === false ? "border-slate-700 bg-slate-800 text-slate-400" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"}`}
                        >
                          {member.isActive === false ? "Inactive" : "Active"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-amber-300">{member.points || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {confirmRemoveId === member.id ? (
                            <>
                              <button type="button" disabled={busyId === member.id} onClick={() => removeMember(member)} className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60">Remove for good</button>
                              <button type="button" onClick={() => setConfirmRemoveId(null)} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-slate-300">Keep</button>
                            </>
                          ) : (
                            <>
                              <button type="button" aria-label={`Edit ${member.name}`} onClick={() => { setConfirmRemoveId(null); setEditing(member); setTimeout(() => document.getElementById("member-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} className="rounded-lg border border-white/15 p-1.5 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300">
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button type="button" aria-label={`Remove ${member.name}`} disabled={member.id === currentUser?.id} title={member.id === currentUser?.id ? "You can't remove your own account" : "Remove member"} onClick={() => setConfirmRemoveId(member.id)} className="rounded-lg border border-white/15 p-1.5 text-slate-300 hover:border-rose-400/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30">
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <EventsAdmin />
          <ProjectsAdmin />
          <AuditAdmin names={Object.fromEntries(members.map((m) => [m.id, m.name]))} />
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}
