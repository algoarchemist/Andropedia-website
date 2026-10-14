"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ClipboardList, ExternalLink, FileText, Trash2 } from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { useAuth } from "@/lib/auth-context";
import type { DomainType, TaskPrompt, Week } from "@/lib/types";

const DOMAINS: DomainType[] = ["Web", "Technical", "R&D", "Design", "Media", "PR"];
const field = "w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none";
const MAX_PDF = 4 * 1024 * 1024;
const label = "text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400";

export default function TasksPage() {
  const { currentUser } = useAuth();
  const isSuper = currentUser?.role === "super_admin";

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [prompts, setPrompts] = useState<TaskPrompt[]>([]);
  const [weekId, setWeekId] = useState("");
  const [domain, setDomain] = useState<DomainType>("Web");
  // Edits are kept against the week+domain they were typed for, so switching selection shows that task (or a blank form).
  const [draft, setDraft] = useState<{ key: string; title: string; description: string; resourceUrl: string; dueDate: string } | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // bumping it clears the file input
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const targetDomain = isSuper ? domain : (currentUser?.domain ?? domain);

  const loadPrompts = useCallback(async () => {
    try {
      const res = await fetch("/api/prompts");
      const data = await res.json();
      if (data.success) setPrompts(data.prompts);
    } catch {
      setError("Could not load the tasks. Check your connection.");
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const res = await fetch("/api/weeks");
        const data = await res.json();
        if (data.success) {
          setWeeks(data.weeks);
          const active = data.weeks.find((w: Week) => w.isActive) ?? data.weeks[data.weeks.length - 1];
          if (active) setWeekId(active.id);
        }
      } catch {
        setError("Could not load the sprint weeks.");
      }
      try {
        const res = await fetch("/api/prompts");
        const data = await res.json();
        if (data.success) setPrompts(data.prompts);
      } catch {
        setError("Could not load the tasks. Check your connection.");
      }
    })();
  }, [currentUser]);

  const existing = prompts.find((p) => p.weekId === weekId && p.domain === targetDomain);
  const key = `${weekId}|${targetDomain}`;
  const current = draft?.key === key ? draft : null;
  const title = current?.title ?? existing?.title ?? "";
  const description = current?.description ?? existing?.description ?? "";
  const resourceUrl = current?.resourceUrl ?? existing?.resourceUrl ?? "";
  const dueDate = current?.dueDate ?? existing?.dueDate ?? "";
  const edit = (patch: Partial<{ title: string; description: string; resourceUrl: string; dueDate: string }>) =>
    setDraft({ key, title, description, resourceUrl, dueDate, ...patch });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pdf && pdf.size > MAX_PDF) {
      setError("That PDF is too large (4 MB at most).");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId, domain: targetDomain, title, description, resourceUrl, dueDate }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Could not save the task.");
        return;
      }
      const verb = existing ? "Task updated." : `Task posted to ${targetDomain} members.`;
      if (pdf) {
        const up = await fetch(`/api/prompts/${data.prompt.id}/file?name=${encodeURIComponent(pdf.name)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: pdf,
        });
        const upData = await up.json().catch(() => ({}));
        if (!upData.success) {
          setError(`${verb} But the PDF was not attached: ${upData.error ?? "upload failed."}`);
          await loadPrompts();
          return;
        }
        setPdf(null);
        setFileKey((k) => k + 1);
      }
      setNotice(verb);
      await loadPrompts();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removePdf(p: TaskPrompt) {
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/prompts/${p.id}/file`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Could not remove the PDF.");
        return;
      }
      setNotice("PDF removed.");
      await loadPrompts();
    } catch {
      setError("Could not reach the server. Try again.");
    }
  }

  async function remove(p: TaskPrompt) {
    if (!window.confirm(`Remove the Week ${p.weekNumber} ${p.domain} task? Members will no longer see it.`)) return;
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/prompts/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Could not remove the task.");
        return;
      }
      setNotice("Task removed.");
      await loadPrompts();
    } catch {
      setError("Could not reach the server. Try again.");
    }
  }

  return (
    <PortalAccessGate allowedRoles={["domain_admin", "super_admin"]}>
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
              <ClipboardList className="h-3.5 w-3.5" />
              {isSuper ? "All domains" : `${currentUser?.domain} domain`}
            </div>
            <h1 className="text-3xl font-black text-white">Post a weekly task</h1>
            <p className="mt-2 text-xs text-slate-400">
              Set what your members should build this week. They see it on the submit page, and you grade what they send in under Evaluations.
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
            <form onSubmit={save} className="space-y-5 rounded-[28px] border border-sky-400/10 bg-white/[0.04] p-6 lg:col-span-7">
              <div className={`grid gap-5 ${isSuper ? "sm:grid-cols-2" : ""}`}>
                <div className="space-y-2">
                  <label htmlFor="task-week" className={label}>Sprint week *</label>
                  <select id="task-week" value={weekId} onChange={(e) => setWeekId(e.target.value)} className={field} required>
                    {weeks.map((w) => (
                      <option key={w.id} value={w.id}>
                        Week {w.weekNumber}: {w.title} {w.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {isSuper && (
                  <div className="space-y-2">
                    <label htmlFor="task-domain" className={label}>Domain *</label>
                    <select id="task-domain" value={domain} onChange={(e) => setDomain(e.target.value as DomainType)} className={field}>
                      {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {existing && <p className="text-[11px] font-mono text-amber-300">A task is already posted for this week. Saving will replace it.</p>}

              <div className="space-y-2">
                <label htmlFor="task-title" className={label}>Title *</label>
                <input id="task-title" value={title} onChange={(e) => edit({ title: e.target.value })} maxLength={120} required className={field} placeholder="e.g. Build a responsive pricing page" />
              </div>
              <div className="space-y-2">
                <label htmlFor="task-desc" className={label}>What to build and how it will be judged *</label>
                <textarea id="task-desc" value={description} onChange={(e) => edit({ description: e.target.value })} maxLength={4000} required rows={7} className={field} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="task-url" className={label}>Brief / starter link</label>
                  <input id="task-url" type="url" value={resourceUrl} onChange={(e) => edit({ resourceUrl: e.target.value })} maxLength={300} className={field} placeholder="https://" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="task-due" className={label}>Due date</label>
                  <input id="task-due" type="date" value={dueDate} onChange={(e) => edit({ dueDate: e.target.value })} className={field} />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="task-pdf" className={label}>PDF brief (optional, 4 MB max)</label>
                {existing?.fileName && !pdf && (
                  <p className="text-[11px] font-mono text-slate-400">Attached: {existing.fileName}. Choose a file to replace it.</p>
                )}
                <input
                  key={fileKey}
                  id="task-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                  className={`${field} file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-300`}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !weekId}
                className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {busy ? "Saving..." : existing ? "Update task" : "Post task"}
              </button>
            </form>

            <div className="space-y-3 lg:col-span-5">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Posted tasks ({prompts.length})</h2>
              {prompts.length === 0 && <p className="text-sm text-slate-500">Nothing posted yet.</p>}
              <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
                {prompts.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">Week {p.weekNumber} · {p.domain}</div>
                        <div className="mt-1 font-bold text-white">{p.title}</div>
                      </div>
                      <button type="button" onClick={() => remove(p)} aria-label={`Remove ${p.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-slate-400">{p.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500">
                      {p.dueDate && <span>Due {p.dueDate}</span>}
                      {p.fileName && (
                        <span className="inline-flex items-center gap-2">
                          <a href={`/api/prompts/${p.id}/file`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">
                            <FileText className="h-3 w-3" /> {p.fileName}
                          </a>
                          <button type="button" onClick={() => removePdf(p)} className="text-slate-500 hover:text-rose-300">remove</button>
                        </span>
                      )}
                      {p.resourceUrl && (
                        <a href={p.resourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:underline">
                          Brief <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}
