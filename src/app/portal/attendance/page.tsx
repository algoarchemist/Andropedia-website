"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CalendarCheck, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { MemberAvatar } from "@/components/portal/MemberEditor";
import { useAuth } from "@/lib/auth-context";
import { MAX_SESSION_DESCRIPTION, SESSION_KIND_LABEL, todayInIndia } from "@/lib/attendance-schema";
import type { AttendanceSessionInfo, DomainMember, EventOption } from "@/lib/attendance";

const field = "w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none";
const label = "text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400";
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

async function call<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || "Something went wrong. Try again.");
  return data as T;
}

export default function DomainAttendancePage() {
  const { currentUser } = useAuth();
  const domain = currentUser?.domain;

  const [sessions, setSessions] = useState<AttendanceSessionInfo[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [members, setMembers] = useState<DomainMember[]>([]);
  const [selectedId, setSelectedId] = useState("");
  // What is ticked on screen, and what is saved on the server; Save sends the difference.
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [meet, setMeet] = useState({ title: "", heldOn: todayInIndia(), hours: "1", kind: "gmeet" as "gmeet" | "club_hour", description: "" });
  const [eventId, setEventId] = useState("");

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  const load = useCallback(async () => {
    const data = await call<{ sessions: AttendanceSessionInfo[]; events: EventOption[]; members: DomainMember[] }>("/api/attendance", "GET");
    setSessions(data.sessions);
    setEvents(data.events);
    setMembers(data.members);
    return data;
  }, []);

  const open = useCallback(async (id: string) => {
    setSelectedId(id);
    setTicked(new Set());
    setSaved(new Set());
    if (!id) return;
    try {
      const data = await call<{ userIds: string[] }>(`/api/attendance/${id}`, "GET");
      setTicked(new Set(data.userIds));
      setSaved(new Set(data.userIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this session.");
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const data = await load();
        if (data.sessions[0]) await open(data.sessions[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load attendance.");
      }
    })();
  }, [currentUser, load, open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => `${m.name} ${m.registerNo ?? ""}`.toLowerCase().includes(q)) : members;
  }, [members, query]);

  const toAdd = [...ticked].filter((id) => !saved.has(id));
  const toRemove = [...saved].filter((id) => !ticked.has(id));
  const dirty = toAdd.length + toRemove.length > 0;

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setAll = (on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      for (const m of visible) {
        if (on) next.add(m.id);
        else next.delete(m.id);
      }
      return next;
    });

  async function run(action: () => Promise<string | void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const message = await action();
      if (message) setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      if (!selected) return;
      if (toAdd.length) await call(`/api/attendance/${selected.id}`, "PUT", { userIds: toAdd, present: true });
      if (toRemove.length) await call(`/api/attendance/${selected.id}`, "PUT", { userIds: toRemove, present: false });
      setSaved(new Set(ticked));
      await load();
      return `Attendance saved for ${selected.title}: ${ticked.size} present.`;
    });

  const createMeet = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const data = await call<{ session: AttendanceSessionInfo }>("/api/attendance", "POST", {
        kind: meet.kind,
        title: meet.title,
        heldOn: meet.heldOn,
        hours: Number(meet.hours),
        ...(meet.description.trim() ? { description: meet.description.trim() } : {}),
      });
      await load();
      await open(data.session.id);
      setMeet((m) => ({ ...m, title: "", description: "" }));
      return `${data.session.title} created. Tick who was there.`;
    });
  };

  const startEvent = () =>
    run(async () => {
      const data = await call<{ session: AttendanceSessionInfo }>("/api/attendance", "POST", { kind: "event", eventId });
      await load();
      await open(data.session.id);
      setEventId("");
      return `${data.session.title} is ready. Tick who was there.`;
    });

  const removeMeet = () => {
    if (!selected?.domain || !window.confirm(`Delete "${selected.title}" and all its attendance marks? This can't be undone.`)) return;
    return run(async () => {
      await call(`/api/attendance/${selected.id}`, "DELETE");
      const data = await load();
      await open(data.sessions[0]?.id ?? "");
      return "Meet deleted.";
    });
  };

  const openEvents = events.filter((e) => !e.hasSession);

  return (
    <PortalAccessGate allowedRoles={["domain_admin"]}>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="border-b border-sky-400/10 pb-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">
              <CalendarCheck className="h-3.5 w-3.5" />
              {domain} domain
            </div>
            <h1 className="text-3xl font-black text-white">Take attendance</h1>
            <p className="mt-2 text-xs text-slate-400">
              Mark your {domain} members present for events, club hours and Google Meets the core team ran, or for a meet your own domain ran.
            </p>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="space-y-5 rounded-[28px] border border-sky-400/10 bg-white/[0.04] p-6 lg:col-span-7">
              <div className="space-y-2">
                <label htmlFor="session" className={label}>Session</label>
                <select id="session" value={selectedId} onChange={(e) => void open(e.target.value)} className={field}>
                  {sessions.length === 0 && <option value="">No sessions yet. Start one on the right.</option>}
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.domain ? `${s.domain} meet` : SESSION_KIND_LABEL[s.kind]}: {s.title} ({dateFmt.format(new Date(s.heldOn))})
                    </option>
                  ))}
                </select>
                {selected?.description && <p className="text-[11px] text-slate-400">{selected.description}</p>}
              </div>

              {selected && (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor="member-search" className="sr-only">Search members</label>
                    <input id="member-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or register number" className={`${field} max-w-xs`} />
                    <button type="button" onClick={() => setAll(true)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40">Tick all shown</button>
                    <button type="button" onClick={() => setAll(false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-white/30">Clear shown</button>
                  </div>

                  <ul className="max-h-[520px] divide-y divide-white/5 overflow-y-auto rounded-2xl border border-white/10">
                    {visible.length === 0 && <li className="p-4 text-sm text-slate-500">No members match.</li>}
                    {visible.map((m) => (
                      <li key={m.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
                          <input type="checkbox" checked={ticked.has(m.id)} onChange={() => toggle(m.id)} className="h-4 w-4 accent-emerald-400" />
                          <MemberAvatar member={{ name: m.name, avatar: m.avatar }} className="h-8 w-8 rounded-full border border-white/10" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">{m.name}</span>
                            {m.registerNo && <span className="block text-[10px] font-mono text-slate-500">{m.registerNo}</span>}
                          </span>
                          {ticked.has(m.id) && <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300">Present</span>}
                        </label>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={save}
                      disabled={busy || !dirty}
                      className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      {busy ? "Saving..." : "Save attendance"}
                    </button>
                    <span className="text-xs font-mono text-slate-400">
                      {ticked.size} of {members.length} present{dirty ? ` · ${toAdd.length + toRemove.length} unsaved` : ""}
                    </span>
                    {selected.domain && (
                      <button type="button" onClick={removeMeet} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-rose-500/10 hover:text-rose-300">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete this meet
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6 lg:col-span-5">
              <form onSubmit={createMeet} className="space-y-4 rounded-[28px] border border-sky-400/10 bg-white/[0.04] p-6">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Start a {domain} meet</h2>
                <div className="space-y-2">
                  <label htmlFor="meet-title" className={label}>Name *</label>
                  <input id="meet-title" required minLength={2} maxLength={120} value={meet.title} onChange={(e) => setMeet({ ...meet, title: e.target.value })} className={field} placeholder="e.g. Web weekly sync" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="meet-kind" className={label}>Type</label>
                    <select id="meet-kind" value={meet.kind} onChange={(e) => setMeet({ ...meet, kind: e.target.value as "gmeet" | "club_hour" })} className={field}>
                      <option value="gmeet">{SESSION_KIND_LABEL.gmeet}</option>
                      <option value="club_hour">{SESSION_KIND_LABEL.club_hour}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="meet-date" className={label}>Date</label>
                    <input id="meet-date" type="date" required value={meet.heldOn} onChange={(e) => setMeet({ ...meet, heldOn: e.target.value })} className={field} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="meet-hours" className={label}>Hours</label>
                    <input id="meet-hours" type="number" min={0.25} max={24} step={0.25} required value={meet.hours} onChange={(e) => setMeet({ ...meet, hours: e.target.value })} className={field} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="meet-desc" className={label}>Note (optional)</label>
                  <textarea id="meet-desc" rows={2} maxLength={MAX_SESSION_DESCRIPTION} value={meet.description} onChange={(e) => setMeet({ ...meet, description: e.target.value })} className={field} />
                </div>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Create meet
                </button>
                <p className="text-[11px] text-slate-500">Only {domain} members are marked on a {domain} meet, and other domains don&apos;t see it.</p>
              </form>

              <div className="space-y-3 rounded-[28px] border border-sky-400/10 bg-white/[0.04] p-6">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Take attendance for an event</h2>
                {openEvents.length === 0 ? (
                  <p className="text-xs text-slate-500">Every event already has a session in the list on the left.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <label htmlFor="event-pick" className="sr-only">Event</label>
                    <select id="event-pick" value={eventId} onChange={(e) => setEventId(e.target.value)} className={`${field} min-w-0 flex-1`}>
                      <option value="">Choose an event...</option>
                      {openEvents.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.title} ({dateFmt.format(new Date(ev.startsAt))})</option>
                      ))}
                    </select>
                    <button type="button" onClick={startEvent} disabled={busy || !eventId} className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">
                      Open
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}
