"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Download, Lock, Mail, Phone, Star, ThumbsDown, ThumbsUp, UserCheck } from "lucide-react";
import { csvRow } from "@/lib/csv";
import { shortlistCsv } from "@/lib/recruitment/export";
import { DOMAIN_QUESTIONS, UNIVERSAL_QUESTIONS, type DomainId } from "@/lib/recruitment/questions";

const STATUSES = ["new", "shortlisted", "accepted", "rejected"] as const;
type Status = (typeof STATUSES)[number];
const DOMAIN_LABEL: Record<string, string> = { technical: "Technical", web: "Web", design: "Design", media: "Media", pr: "PR" };
const STATUS_LABEL: Record<Status, string> = { new: "New", shortlisted: "Shortlisted", accepted: "Accepted", rejected: "Rejected" };
const STATUS_STYLE: Record<Status, string> = {
  new: "border-slate-600 bg-slate-800 text-slate-300",
  shortlisted: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  accepted: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

interface Applicant {
  id: string;
  reference: string;
  name: string;
  registerNo: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  profile: string;
  domain: string;
  answers: Record<string, string>;
  status: Status;
  emailSentAt: string | null;
  createdAt: string;
  /** The signed-in reviewer's own private notes. */
  myReview: Review | null;
  /** What other reviewers wrote. Only a super admin receives these. */
  otherReviews: Array<Review & { reviewer: string }>;
}

interface Review {
  rating: number | null;
  comment: string;
}

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const field = "rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-emerald-400 focus:outline-none";
const actionBase = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50";

/** The reviewer's private rating (1 to 10) and comment on one applicant. Nobody else (except super admins) can read it. */
function ReviewPanel({ row, onSaved }: { row: Applicant; onSaved: (review: Review | null) => void }) {
  const [rating, setRating] = useState<number | null>(row.myReview?.rating ?? null);
  const [comment, setComment] = useState(row.myReview?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const changed = rating !== (row.myReview?.rating ?? null) || comment.trim() !== (row.myReview?.comment ?? "");

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/applications/${row.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not save your notes.");
      onSaved(data.review ? { rating: data.review.rating, comment: data.review.comment } : null);
      setMessage({ type: "success", text: data.review ? "Saved." : "Cleared." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Could not save your notes." });
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-300">
        <Lock className="h-3 w-3" aria-hidden="true" /> Your private notes
      </p>
      <p className="mt-1 text-[11px] text-slate-400">Only you can see these, and super admins. The applicant never does.</p>

      <fieldset className="mt-3">
        <legend className="text-[11px] font-semibold text-slate-400">Rating out of 10</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? null : n)}
              aria-pressed={rating === n}
              aria-label={`Rate ${n} out of 10`}
              className={`h-8 w-8 rounded-lg border text-xs font-bold transition-colors ${
                rating === n ? "border-amber-300 bg-amber-400 text-slate-950" : "border-white/15 text-slate-300 hover:border-amber-400/50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor={`note-${row.id}`} className="mt-3 block text-[11px] font-semibold text-slate-400">Comment</label>
      <textarea
        id={`note-${row.id}`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="What stood out? Anything to ask in the interview?"
        className="mt-1 w-full resize-y rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={saving || !changed} className={`${actionBase} border-amber-400/40 text-amber-200 hover:bg-amber-500/15`}>
          {saving ? "Saving..." : "Save notes"}
        </button>
        {message && <span role={message.type === "error" ? "alert" : "status"} className={`text-[11px] ${message.type === "error" ? "text-rose-300" : "text-emerald-300"}`}>{message.text}</span>}
      </div>

      {row.otherReviews.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Other reviewers (super admin view)</p>
          {row.otherReviews.map((r, i) => (
            <div key={i} className="text-[11px] text-slate-300">
              <span className="font-semibold text-white">{r.reviewer}</span>
              {r.rating !== null && <span className="ml-2 font-mono text-amber-300">{r.rating}/10</span>}
              {r.comment && <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-400">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Recruitment applications. A lead gets only the applicants to their own domain (the server decides that); a super admin gets every
 * domain, with a domain filter and the CSV export. Anyone who can open it can read the answers and accept, reject or shortlist.
 */
export function ApplicantsReview({ canExport = false }: { canExport?: boolean }) {
  const [rows, setRows] = useState<Applicant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [scope, setScope] = useState<"all" | "domain">("domain");
  const [tab, setTab] = useState<"all" | Status>("all");
  const [domain, setDomain] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "rating">("newest");
  const [open, setOpen] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ id: string; status: Status } | null>(null);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/applications", { cache: "no-store" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRows(data.applications);
      setScope(data.scope === "all" ? "all" : "domain");
    } catch {
      setNotice({ type: "error", text: "Could not load applications." });
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const decide = async (row: Applicant, next: Status) => {
    setConfirming(null);
    if (next === row.status) return;
    const emails = notify && next !== "new";
    setBusy(row.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/applications/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, notify: emails }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Could not update the status.");
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
      const mail = data.emailed === true ? " and emailed them" : data.emailed === false ? ", but the email failed to send" : "";
      setNotice({ type: data.emailed === false ? "error" : "success", text: `${row.name} is now ${next}${mail}.` });
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Could not update the status." });
    } finally {
      setBusy(null);
    }
  };

  const counts = useMemo(
    () => ({ all: rows.length, ...Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length])) }) as Record<"all" | Status, number>,
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = rows.filter(
      (r) =>
        (tab === "all" || r.status === tab) &&
        (domain === "all" || r.domain === domain) &&
        (!q || `${r.name} ${r.email} ${r.registerNo} ${r.phone} ${r.reference} ${r.department}`.toLowerCase().includes(q)),
    );
    // Highest of my own ratings first; applicants I have not rated go last, newest first among themselves.
    return sort === "rating" ? [...matching].sort((x, y) => (y.myReview?.rating ?? 0) - (x.myReview?.rating ?? 0)) : matching;
  }, [rows, tab, domain, query, sort]);

  const download = (text: string, name: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const ids = [...new Set([...UNIVERSAL_QUESTIONS, ...Object.values(DOMAIN_QUESTIONS).flat()].map((q) => q.id))];
    const lines = [
      csvRow(["reference", "applied_at", "status", "name", "register_no", "department", "year", "phone", "email", "profile", "domain", ...ids]),
      ...visible.map((r) =>
        csvRow([r.reference, r.createdAt, r.status, r.name, r.registerNo, r.department, r.year, r.phone, r.email, r.profile, r.domain, ...ids.map((id) => r.answers[id] ?? "")]),
      ),
    ];
    download(lines.join("\n"), `applications-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // The shortlist for the domain on screen (a lead's own, or the domain a super admin filtered to). Opens in Excel and Google Sheets.
  const shortlisted = useMemo(() => rows.filter((r) => r.status === "shortlisted" && (domain === "all" || r.domain === domain)), [rows, domain]);
  const exportShortlist = () =>
    download(shortlistCsv(shortlisted), `shortlisted-${domain === "all" ? "all-domains" : domain}-${new Date().toISOString().slice(0, 10)}.csv`);

  const questionsFor = (row: Applicant) => [...UNIVERSAL_QUESTIONS, ...(DOMAIN_QUESTIONS[row.domain as DomainId] ?? [])].filter((q) => row.answers[q.id]);

  /** Accept, reject and shortlist. Each asks once more before anything is saved or emailed. */
  const actions = (r: Applicant) => {
    if (confirming?.id === r.id) {
      const word = confirming.status === "new" ? "Move back to new" : STATUS_LABEL[confirming.status];
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-300">
            {word}? {notify && confirming.status !== "new" ? "They will be emailed." : ""}
          </span>
          <button type="button" onClick={() => void decide(r, confirming.status)} className={`${actionBase} border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25`}>
            <Check className="h-3 w-3" aria-hidden="true" /> Confirm
          </button>
          <button type="button" onClick={() => setConfirming(null)} className={`${actionBase} border-white/15 text-slate-300 hover:text-white`}>Cancel</button>
        </div>
      );
    }
    const ask = (status: Status) => () => setConfirming({ id: r.id, status });
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {r.status !== "accepted" && (
          <button type="button" disabled={busy === r.id} onClick={ask("accepted")} aria-label={`Accept ${r.name}`} className={`${actionBase} border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/15`}>
            <ThumbsUp className="h-3 w-3" aria-hidden="true" /> Accept
          </button>
        )}
        {r.status !== "rejected" && (
          <button type="button" disabled={busy === r.id} onClick={ask("rejected")} aria-label={`Reject ${r.name}`} className={`${actionBase} border-rose-400/30 text-rose-300 hover:bg-rose-500/15`}>
            <ThumbsDown className="h-3 w-3" aria-hidden="true" /> Reject
          </button>
        )}
        {r.status === "new" && (
          <button type="button" disabled={busy === r.id} onClick={ask("shortlisted")} aria-label={`Shortlist ${r.name}`} className={`${actionBase} border-sky-400/30 text-sky-300 hover:bg-sky-500/15`}>
            <UserCheck className="h-3 w-3" aria-hidden="true" /> Shortlist
          </button>
        )}
        {(r.status === "accepted" || r.status === "rejected") && (
          <button type="button" disabled={busy === r.id} onClick={ask("new")} className={`${actionBase} border-white/15 text-slate-400 hover:text-white`}>Reopen</button>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(2,6,23,0.45)]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            Applications ({visible.length}
            {visible.length !== rows.length ? ` of ${rows.length}` : ""})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportShortlist}
              disabled={shortlisted.length === 0}
              title="Name, department, year, phone and email of everyone shortlisted. Opens in Excel and Google Sheets."
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/10 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export shortlisted ({shortlisted.length})
            </button>
            {canExport && (
              <button type="button" onClick={exportCsv} disabled={visible.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:border-emerald-400/40 disabled:opacity-40">
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export all (full)
              </button>
            )}
          </div>
        </div>

        <div role="tablist" aria-label="Application status" className="flex flex-wrap gap-1.5">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={tab === s}
              onClick={() => setTab(s)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === s ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABEL[s]} <span className="ml-1 font-mono text-[10px] opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="applicant-search">Search applicants</label>
          <input id="applicant-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, register no..." className={`${field} w-full sm:w-72`} />
          {scope === "all" && (
            <>
              <label className="sr-only" htmlFor="applicant-domain">Filter by domain</label>
              <select id="applicant-domain" value={domain} onChange={(e) => setDomain(e.target.value)} className={field}>
                <option value="all">All domains</option>
                {Object.entries(DOMAIN_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </>
          )}
          <label className="sr-only" htmlFor="applicant-sort">Sort applicants</label>
          <select id="applicant-sort" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "rating")} className={field}>
            <option value="newest">Newest first</option>
            <option value="rating">My rating, high to low</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-emerald-400" />
            Email the applicant when I accept or reject
          </label>
        </div>

        {notice && (
          <p role={notice.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-2.5 text-xs ${notice.type === "error" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}>
            {notice.text}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead className="bg-white/[0.02] text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-4" aria-label="Details" />
              <th className="px-4 py-4">Applicant</th>
              <th className="px-4 py-4">Contact</th>
              {scope === "all" && <th className="px-4 py-4">Domain</th>}
              <th className="px-4 py-4">Applied</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!loaded && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading applications...</td></tr>}
            {loaded && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  {rows.length === 0 ? "No applications yet." : "No applications match these filters."}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <Fragment key={r.id}>
                <tr className="align-top hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} aria-label={`${open === r.id ? "Hide" : "Show"} answers from ${r.name}`} className="text-slate-400 hover:text-white">
                      {open === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-white">{r.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{r.registerNo}</div>
                    <div className="text-[11px] text-slate-500">{r.department} · {r.year}</div>
                  </td>
                  <td className="px-4 py-4 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5 break-all"><Mail className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />{r.email}</div>
                    <div className="mt-1 flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />{r.phone}</div>
                  </td>
                  {scope === "all" && (
                    <td className="px-4 py-4"><span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-slate-300">{DOMAIN_LABEL[r.domain] ?? r.domain}</span></td>
                  )}
                  <td className="px-4 py-4 text-slate-400">{fmt.format(new Date(r.createdAt))}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_STYLE[r.status] ?? STATUS_STYLE.new}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                    {r.myReview?.rating != null && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-mono text-amber-300" title="Your private rating">
                        <Star className="h-3 w-3 fill-amber-300" aria-hidden="true" /> {r.myReview.rating}/10
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">{actions(r)}</td>
                </tr>
                {open === r.id && (
                  <tr className="bg-black/30">
                    <td />
                    <td colSpan={scope === "all" ? 6 : 5} className="space-y-4 px-4 py-5">
                      <dl className="grid gap-x-8 gap-y-2 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
                        {[["Reference", r.reference], ["Register no.", r.registerNo], ["Phone", r.phone], ["Email", r.email], ["Profile", r.profile], ["Department / year", `${r.department} · ${r.year}`]].map(([k, v]) => (
                          <div key={k}><dt className="font-mono uppercase tracking-wider text-slate-500">{k}</dt><dd className="mt-0.5 break-all text-slate-200">{v}</dd></div>
                        ))}
                      </dl>
                      <div className="space-y-3">
                        {questionsFor(r).map((q) => (
                          <div key={q.id}>
                            <p className="text-[11px] font-semibold text-slate-400">{q.label}</p>
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-100">{r.answers[q.id]}</p>
                          </div>
                        ))}
                      </div>
                      <ReviewPanel row={r} onSaved={(review) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, myReview: review } : x)))} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
