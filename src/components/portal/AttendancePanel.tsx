"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck, Check, FileUp, Plus, Trash2, X } from "lucide-react";
import { MAX_ATTENDANCE_CSV_BYTES } from "@/lib/attendance-schema";
import type { AttendanceSessionInfo, EventOption, ImportReport } from "@/lib/attendance";

type Notice = { type: "error" | "success"; text: string };

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

async function call<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) throw new Error(data?.error || "Something went wrong. Please try again.");
  return data as T;
}

/**
 * Attendance state for the member list: the chosen session and who is present. `toggle` and `markMany` update the list
 * straight away and put it back if the server refuses.
 */
export function useAttendance(enabled: boolean) {
  const [sessions, setSessions] = useState<AttendanceSessionInfo[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const refreshList = useCallback(async () => {
    const data = await call<{ sessions: AttendanceSessionInfo[]; events: EventOption[] }>("/api/admin/attendance", "GET");
    setSessions(data.sessions);
    setEvents(data.events);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshList().catch(() => setNotice({ type: "error", text: "Could not load attendance sessions." }));
  }, [enabled, refreshList]);

  const fail = (err: unknown, fallback: string) => setNotice({ type: "error", text: err instanceof Error ? err.message : fallback });

  const select = useCallback(async (id: string | null) => {
    setSelectedId(id);
    setPresent(new Set());
    setReport(null);
    setNotice(null);
    if (!id) return;
    try {
      const data = await call<{ userIds: string[] }>(`/api/admin/attendance/${id}`, "GET");
      setPresent(new Set(data.userIds));
    } catch (err) {
      fail(err, "Could not load who was present.");
    }
  }, []);

  const bump = (id: string, by: number) => setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, present: Math.max(0, s.present + by) } : s)));

  const markMany = async (userIds: string[], isPresent: boolean) => {
    if (!selectedId || userIds.length === 0) return;
    const before = present;
    const next = new Set(before);
    for (const id of userIds) {
      if (isPresent) next.add(id);
      else next.delete(id);
    }
    setPresent(next);
    setNotice(null);
    try {
      await call(`/api/admin/attendance/${selectedId}`, "PUT", { userIds, present: isPresent });
      bump(selectedId, next.size - before.size);
    } catch (err) {
      setPresent(before);
      fail(err, "Could not save attendance.");
    }
  };

  const toggle = (userId: string) => markMany([userId], !present.has(userId));

  const openSession = async (input: { kind: "event"; eventId: string } | { kind: "club_hour"; title: string; heldOn: string; hours: number }) => {
    setBusy(true);
    setNotice(null);
    try {
      const data = await call<{ session: AttendanceSessionInfo }>("/api/admin/attendance", "POST", input);
      await refreshList();
      await select(data.session.id);
      return true;
    } catch (err) {
      fail(err, "Could not open the session.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (file: File) => {
    if (!selectedId) return;
    setBusy(true);
    setNotice(null);
    setReport(null);
    try {
      if (file.size > MAX_ATTENDANCE_CSV_BYTES) throw new Error("That file is too large (the limit is 512 KB).");
      const csv = await file.text();
      const data = await call<{ report: ImportReport }>(`/api/admin/attendance/${selectedId}/import`, "POST", { csv });
      setReport(data.report);
      await select(selectedId);
      setReport(data.report);
      await refreshList();
    } catch (err) {
      fail(err, "Could not import the file.");
    } finally {
      setBusy(false);
    }
  };

  const removeSession = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await call(`/api/admin/attendance/${selectedId}`, "DELETE");
      await select(null);
      await refreshList();
      setNotice({ type: "success", text: "Session deleted." });
    } catch (err) {
      fail(err, "Could not delete the session.");
    } finally {
      setBusy(false);
    }
  };

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  return { sessions, events, selected, selectedId, present, busy, notice, report, select, toggle, markMany, openSession, importCsv, removeSession };
}

export type AttendanceState = ReturnType<typeof useAttendance>;

const field = "rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-emerald-400 focus:outline-none disabled:opacity-50";
const NEW_HOUR = "__club_hour__";

/** Pick an event or club hour, then tick members in the table below or import a CSV. */
export function AttendancePanel({ attendance, visibleIds }: { attendance: AttendanceState; visibleIds: string[] }) {
  const { sessions, events, selected, present, busy, notice, report } = attendance;
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(today);
  const [hours, setHours] = useState("1");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const eventsWithoutSession = events.filter((e) => !e.hasSession);

  const onPick = (value: string) => {
    setConfirmDelete(false);
    if (value === NEW_HOUR) {
      setCreating(true);
      void attendance.select(null);
    } else if (value.startsWith("event:")) {
      setCreating(false);
      void attendance.openSession({ kind: "event", eventId: value.slice(6) });
    } else {
      setCreating(false);
      void attendance.select(value || null);
    }
  };

  const createHour = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await attendance.openSession({ kind: "club_hour", title, heldOn: day, hours: Number(hours) || 1 });
    if (ok) {
      setCreating(false);
      setTitle("");
    }
  };

  const shownPresent = visibleIds.filter((id) => present.has(id)).length;

  return (
    <div className="border-b border-white/10 px-6 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <CalendarCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Attendance
        </div>
        <div>
          <label htmlFor="attendance-session" className="mb-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Event or club hour</label>
          <select id="attendance-session" value={creating ? NEW_HOUR : (selected?.id ?? "")} disabled={busy} onChange={(e) => onPick(e.target.value)} className={`${field} w-72 max-w-full`}>
            <option value="">Choose a session...</option>
            <option value={NEW_HOUR}>+ New club hour</option>
            {sessions.length > 0 && (
              <optgroup label="Sessions">
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.kind === "event" ? "Event" : "Club hour"}: {s.title} ({fmt.format(new Date(s.heldOn))}) · {s.present} present
                  </option>
                ))}
              </optgroup>
            )}
            {eventsWithoutSession.length > 0 && (
              <optgroup label="Events with no attendance yet">
                {eventsWithoutSession.map((ev) => (
                  <option key={ev.id} value={`event:${ev.id}`}>{ev.title} ({fmt.format(new Date(ev.startsAt))})</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {selected && (
          <>
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40 disabled:opacity-50">
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" /> Import CSV
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="Attendance CSV file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void attendance.importCsv(file);
              }}
            />
            <button type="button" disabled={busy || visibleIds.length === 0} onClick={() => void attendance.markMany(visibleIds, true)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-400/40 disabled:opacity-50">
              Mark shown present
            </button>
            <button type="button" disabled={busy || shownPresent === 0} onClick={() => void attendance.markMany(visibleIds.filter((id) => present.has(id)), false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400/40 disabled:opacity-50">
              Clear shown
            </button>
            {confirmDelete ? (
              <span className="inline-flex items-center gap-2">
                <button type="button" disabled={busy} onClick={() => { setConfirmDelete(false); void attendance.removeSession(); }} className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60">Delete session</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-slate-300">Keep</button>
              </span>
            ) : (
              <button type="button" aria-label="Delete this session" title="Delete this session and its attendance" onClick={() => setConfirmDelete(true)} className="rounded-lg border border-white/15 p-1.5 text-slate-300 hover:border-rose-400/40 hover:text-rose-300">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </div>

      {creating && (
        <form onSubmit={createHour} className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div>
            <label htmlFor="hour-title" className="mb-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Name</label>
            <input id="hour-title" required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Club hour - Week 3" className={`${field} w-64`} />
          </div>
          <div>
            <label htmlFor="hour-date" className="mb-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Date</label>
            <input id="hour-date" type="date" required value={day} onChange={(e) => setDay(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="hour-length" className="mb-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Hours</label>
            <input id="hour-length" type="number" min={0.25} max={24} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} className={`${field} w-20`} />
          </div>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black disabled:opacity-60">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Create
          </button>
          <button type="button" onClick={() => setCreating(false)} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300">
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
          </button>
        </form>
      )}

      {selected ? (
        <p className="mt-3 text-[11px] text-slate-400">
          <span className="font-semibold text-white">{selected.title}</span> · {fmt.format(new Date(selected.heldOn))}
          {selected.hours ? ` · ${selected.hours} h` : ""} · <span className="text-emerald-300">{present.size} present</span>. Tick members in the table, or import a CSV with a <code className="font-mono text-slate-300">register_number</code> or <code className="font-mono text-slate-300">email</code> column.
        </p>
      ) : (
        !creating && <p className="mt-3 text-[11px] text-slate-500">Choose an event or a club hour to take attendance, then tick members below or import a CSV.</p>
      )}

      {notice && (
        <p role={notice.type === "error" ? "alert" : "status"} className={`mt-3 rounded-lg border px-3 py-2 text-xs ${notice.type === "error" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}>
          {notice.text}
        </p>
      )}

      {report && (
        <div role="status" className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-300"><Check className="h-3.5 w-3.5" aria-hidden="true" /> {report.marked} marked present from {report.rows} row{report.rows === 1 ? "" : "s"}.</p>
          <ul className="mt-1 list-disc pl-5 text-slate-400">
            {report.alreadyMarked > 0 && <li>{report.alreadyMarked} {report.alreadyMarked === 1 ? "was" : "were"} already marked.</li>}
            {report.duplicates > 0 && <li>{report.duplicates} repeated {report.duplicates === 1 ? "row" : "rows"} ignored.</li>}
            {report.blankRows > 0 && <li>{report.blankRows} blank {report.blankRows === 1 ? "row" : "rows"} skipped.</li>}
            {report.notFoundCount > 0 && (
              <li className="text-amber-300">
                {report.notFoundCount} not matched to any member: <span className="break-all font-mono text-[11px]">{report.notFound.join(", ")}{report.notFoundCount > report.notFound.length ? ", ..." : ""}</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
