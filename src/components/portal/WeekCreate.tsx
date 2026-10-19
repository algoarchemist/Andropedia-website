"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const input = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-emerald-400/60 focus:outline-none";

/** Create the next sprint week. `nextNumber` pre-fills the week number; `onCreated` reloads the list. */
export function WeekCreate({ nextNumber, onCreated }: { nextNumber: number; onCreated: (message: string) => void }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ weekNumber: String(nextNumber), title: "", theme: "", startDate: "", endDate: "", promptDescription: "", isActive: false });
  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/weeks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekNumber: Number(form.weekNumber),
          title: form.title,
          theme: form.theme,
          startDate: form.startDate,
          endDate: form.endDate,
          promptDescription: form.promptDescription.trim() || null,
          isActive: form.isActive,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not create the week.");
      setShow(false);
      setForm({ weekNumber: String(nextNumber + 1), title: "", theme: "", startDate: "", endDate: "", promptDescription: "", isActive: false });
      onCreated(`Week ${data.week.weekNumber} created${form.isActive ? " and opened" : ""}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the week.");
    } finally {
      setBusy(false);
    }
  };

  if (!show) {
    return (
      <button type="button" onClick={() => setShow(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New week
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-5 sm:grid-cols-2">
      <label className="space-y-1 text-xs text-slate-300">Week number
        <input className={input} type="number" min={1} max={500} required value={form.weekNumber} onChange={(e) => set("weekNumber", e.target.value)} />
      </label>
      <label className="space-y-1 text-xs text-slate-300">Title
        <input className={input} required minLength={3} maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Sprint 5: Realtime" />
      </label>
      <label className="space-y-1 text-xs text-slate-300">Club theme (every domain builds around it)
        <input className={input} required minLength={3} maxLength={120} value={form.theme} onChange={(e) => set("theme", e.target.value)} placeholder="AI" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-slate-300">Starts
          <input className={input} type="date" required value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-slate-300">Ends
          <input className={input} type="date" required value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </label>
      </div>
      <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Note for all domains (optional; leads post the actual tasks)
        <textarea className={`${input} min-h-20`} maxLength={2000} value={form.promptDescription} onChange={(e) => set("promptDescription", e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-300 sm:col-span-2">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="accent-emerald-400" />
        Open it for submissions now (closes the currently open week)
      </label>
      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-60">{busy ? "Creating..." : "Create week"}</button>
        <button type="button" onClick={() => setShow(false)} className="rounded-lg border border-white/15 px-4 py-2 text-xs text-slate-300">Cancel</button>
      </div>
    </form>
  );
}
