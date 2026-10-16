"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Megaphone, Send, Trash2 } from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { useAuth } from "@/lib/auth-context";

interface Item {
  id: string;
  title: string;
  body: string;
  domain: string;
  authorName: string;
  createdAt: string;
  canDelete: boolean;
}

const DOMAINS = ["Technical", "Web", "PR", "R&D", "Design", "Media"];
const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const input = "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none sm:text-sm";

export default function AnnouncementsPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "super_admin";
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [domain, setDomain] = useState("");
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setItems(data.announcements);
    } catch {
      setNotice({ type: "error", text: "Could not load announcements." });
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const target = isAdmin ? domain || currentUser?.domain || "" : currentUser?.domain ?? "";

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setPosting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, ...(isAdmin ? { domain: target } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Could not post the announcement.");
      setTitle("");
      setBody("");
      setNotice({ type: "success", text: `Posted. ${target === "All" ? "Everyone" : `${target} members`} will see it on their dashboard.` });
      await load();
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Could not post the announcement." });
    }
    setPosting(false);
  };

  const remove = async (item: Item) => {
    setNotice(null);
    try {
      const res = await fetch(`/api/announcements/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Could not remove it.");
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Could not remove it." });
    }
  };

  return (
    <PortalAccessGate allowedRoles={["domain_admin", "super_admin"]}>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300">
              <Megaphone className="h-3.5 w-3.5" /> Announcements
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">Message your members</h1>
            <p className="mt-2 text-sm text-slate-300">
              {isAdmin ? "Post to one domain or to everyone." : `Post to the ${currentUser?.domain ?? ""} domain.`} Members see it on their dashboard with a New badge until they open it.
            </p>
          </div>

          <form onSubmit={post} className="glass-card space-y-4 p-5 sm:p-6">
            {isAdmin && (
              <div className="space-y-1.5">
                <label htmlFor="ann-domain" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">Send to</label>
                <select id="ann-domain" value={target} onChange={(e) => setDomain(e.target.value)} className={input}>
                  <option value="All">Everyone</option>
                  {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="ann-title" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">Title</label>
              <input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required minLength={3} placeholder="e.g. Week 5 deadline moved to Sunday" className={input} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ann-body" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">Message</label>
              <textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} required minLength={3} rows={5} placeholder="Deadlines, instructions, links..." className={`${input} resize-y`} />
              <p className="text-right text-[12px] text-white/40">{body.length}/1500</p>
            </div>
            {notice && (
              <div role={notice.type === "error" ? "alert" : "status"} className={`flex items-center gap-2 rounded-xl border p-3 text-[13px] ${notice.type === "error" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}>
                {notice.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{notice.text}</span>
              </div>
            )}
            <button type="submit" disabled={posting} className="btn-glow inline-flex items-center gap-2 disabled:opacity-60">
              <Send className="h-4 w-4" aria-hidden="true" /> {posting ? "Posting..." : "Post announcement"}
            </button>
          </form>

          <section aria-labelledby="posted-heading" className="space-y-3">
            <h2 id="posted-heading" className="text-lg font-bold text-white">{isAdmin ? "All announcements" : "Recent announcements"}</h2>
            {!loaded ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : items.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-slate-400">Nothing posted yet.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white">{a.title}</h3>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">{a.domain === "All" ? "Everyone" : a.domain}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-200">{a.body}</p>
                        <p className="mt-2 text-[11px] font-mono text-slate-500">{a.authorName} · {fmt.format(new Date(a.createdAt))}</p>
                      </div>
                      {a.canDelete && (
                        <button type="button" onClick={() => void remove(a)} aria-label={`Remove ${a.title}`} className="shrink-0 rounded-lg border border-white/10 p-2 text-slate-400 hover:border-rose-400/40 hover:text-rose-300">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PortalAccessGate>
  );
}
