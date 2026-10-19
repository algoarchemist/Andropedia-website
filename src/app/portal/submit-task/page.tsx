"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, CheckCircle2, AlertCircle, ArrowLeft, Globe, HardDrive, Palette, Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/ui/SocialIcons";
import { PortalNav } from "@/components/portal/PortalNav";
import { useAuth } from "@/lib/auth-context";
import { TaskPrompt, Week } from "@/lib/types";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function SubmitTaskPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const domainOptions = ["Web", "Technical", "R&D", "Design", "Media", "PR"] as const;
  type DomainOption = (typeof domainOptions)[number];

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weeksLoaded, setWeeksLoaded] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [domain, setDomain] = useState<DomainOption>(currentUser?.domain as DomainOption | undefined ?? "Web");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const effectiveDomain = currentUser?.domain ?? domain;

  // The task the lead posted for this week and the member's own domain (the API only returns that domain's).
  const [prompts, setPrompts] = useState<TaskPrompt[]>([]);
  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((d) => d.success && setPrompts(d.prompts))
      .catch(() => undefined); // the brief is a convenience; submitting works without it
  }, [currentUser]);
  const brief = prompts.find((p) => p.weekId === selectedWeekId && p.domain === effectiveDomain);
  // Only an open week takes submissions, and only once the member's lead has posted that domain's task.
  const openWeeks = weeks.filter((w) => w.isActive);
  const selectedWeek = openWeeks.find((w) => w.id === selectedWeekId);
  const canSubmit = Boolean(selectedWeek && brief);

  useEffect(() => {
    async function fetchWeeks() {
      try {
        const res = await fetch("/api/weeks");
        const data = await res.json();
        if (data.success) {
          setWeeks(data.weeks);
          const active = data.weeks.find((w: Week) => w.isActive);
          if (active) setSelectedWeekId(active.id);
        }
      } catch (err) {
        console.error("Error loading weeks:", err);
      } finally {
        setWeeksLoaded(true);
      }
    }
    fetchWeeks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        weekId: selectedWeekId,
        title,
        description,
        driveUrl: driveUrl || undefined,
        githubUrl: githubUrl || undefined,
        liveUrl: liveUrl || undefined,
        figmaUrl: figmaUrl || undefined,
        notes: notes || undefined,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/portal/dashboard");
        }, 1800);
      } else {
        setErrorMsg(data.error || "Failed to submit task. Please try again.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMsg("Network error submitting task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalAccessGate allowedRoles={["member"]}>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="mb-6 flex items-center gap-2">
            <Link href="/portal/dashboard" className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 transition-colors hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
          </div>

          <div className="rounded-[28px] border border-sky-400/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.6)] sm:p-10">
            <div className="border-b border-white/10 pb-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Weekly deliverable dispatch
              </div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">Submit task deliverable</h1>
              <p className="mt-2 text-xs text-slate-400">Provide project links and details; your domain lead will score the submission against the rubric.</p>
            </div>

            {success ? (
              <div className="mt-8 rounded-[24px] border border-emerald-400/25 bg-emerald-500/10 p-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">Deliverable submitted successfully!</h2>
                <p className="mt-2 text-sm text-slate-300">Your task is now in the evaluation queue. Redirecting to the dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {selectedWeek && (
                  <div className="rounded-2xl border border-violet-400/25 bg-violet-500/5 p-5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-300">Club theme · Week {selectedWeek.weekNumber}</div>
                    <div className="mt-1 text-lg font-bold text-white">{selectedWeek.theme}</div>
                    {selectedWeek.promptDescription && <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{selectedWeek.promptDescription}</p>}
                  </div>
                )}

                {weeksLoaded && !selectedWeek && (
                  <p role="status" className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-200">
                    No sprint week is open right now, so submissions are closed. Check back when the next theme starts.
                  </p>
                )}

                {selectedWeek && !brief && (
                  <p role="status" className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Your {effectiveDomain} lead hasn&apos;t posted a task for this week yet, so submissions are closed for now. Check back soon.
                  </p>
                )}

                {brief && (
                  <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">
                      This week&apos;s {brief.domain} task from your lead{brief.dueDate ? ` · due ${brief.dueDate}` : ""}
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">{brief.title}</div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{brief.description}</p>
                    {brief.fileName && (
                      <a href={`/api/prompts/${brief.id}/file`} target="_blank" rel="noopener noreferrer" className="mr-4 mt-3 inline-block text-xs font-semibold text-cyan-300 hover:underline">
                        Download PDF ({brief.fileName})
                      </a>
                    )}
                    {brief.resourceUrl && (
                      <a href={brief.resourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-semibold text-cyan-300 hover:underline">
                        Open the brief
                      </a>
                    )}
                  </div>
                )}

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">Evaluation week cycle *</label>
                    <select
                      value={selectedWeekId}
                      onChange={(e) => setSelectedWeekId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {openWeeks.map((w) => (
                        <option key={w.id} value={w.id}>
                          Week {w.weekNumber}: {w.theme}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">Target domain *</label>
                    <select
                      value={effectiveDomain}
                      onChange={(e) => setDomain(e.target.value as DomainOption)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="Web">Web Development</option>
                      <option value="Technical">Technical (Systems & Algorithms)</option>
                      <option value="R&D">R&D (Machine Learning & Research)</option>
                      <option value="Design">Design & UX</option>
                      <option value="Media">Media & VFX</option>
                      <option value="PR">PR & Outreach</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">Task title *</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Distributed rate limiter with Redis edge middleware"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">Deliverable summary *</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain implementation, architecture choices, algorithms used, and verification steps..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5">
                  <label htmlFor="drive-url" className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    Google Drive link
                  </label>
                  <input
                    id="drive-url"
                    type="url"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Upload your files to Google Drive, choose Share, set access to &ldquo;Anyone with the link&rdquo;, then paste the link here. Your lead can&apos;t open it otherwise.
                  </p>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">Other project links</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                        <GithubIcon className="h-3.5 w-3.5 text-emerald-300" />
                        GitHub repo
                      </label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                        <Globe className="h-3.5 w-3.5 text-cyan-300" />
                        Live demo
                      </label>
                      <input
                        type="url"
                        value={liveUrl}
                        onChange={(e) => setLiveUrl(e.target.value)}
                        placeholder="https://your-project.vercel.app"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                        <Palette className="h-3.5 w-3.5 text-violet-300" />
                        Figma / design asset
                      </label>
                      <input
                        type="url"
                        value={figmaUrl}
                        onChange={(e) => setFigmaUrl(e.target.value)}
                        placeholder="https://figma.com/..."
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">Additional notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any implementation notes, blockers, or follow-ups..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-[0_16px_30px_rgba(52,211,153,0.22)] disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Submitting..." : "Submit deliverable"}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}
