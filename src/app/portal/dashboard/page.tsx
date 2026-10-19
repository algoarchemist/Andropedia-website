"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Send,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Star,
  Hourglass,
  MessageSquareQuote,
  HardDrive,
  Trash2,
} from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { useAuth } from "@/lib/auth-context";
import { Task, TaskPrompt, Week } from "@/lib/types";
import { AnnouncementFeed } from "@/components/portal/AnnouncementFeed";
import { daysLeft, describeDaysLeft } from "@/lib/days-left";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function DashboardPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
  // The task this member's lead set for the open week, if any (its due date drives the countdown).
  const [prompt, setPrompt] = useState<TaskPrompt | null>(null);
  // Consecutive days signed in: the same number the leaderboard and the profile show.
  const [streak, setStreak] = useState(0);
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const resTasks = await fetch("/api/tasks") // the server returns only this member's tasks;
        const dataTasks = await resTasks.json();
        if (dataTasks.success) {
          setTasks(dataTasks.tasks);
        }

        const resWeeks = await fetch("/api/weeks");
        const dataWeeks = await resWeeks.json();
        if (dataWeeks.success) {
          const current = dataWeeks.weeks.find((w: Week) => w.isActive);
          const shown: Week | undefined = current || dataWeeks.weeks[dataWeeks.weeks.length - 1];
          setActiveWeek(shown ?? null);
          if (current) {
            const resPrompt = await fetch(`/api/prompts?weekId=${encodeURIComponent(current.id)}`, { cache: "no-store" });
            const dataPrompt = await resPrompt.json().catch(() => null);
            if (dataPrompt?.success) setPrompt((dataPrompt.prompts as TaskPrompt[]).find((p) => p.domain === currentUser?.domain) ?? null);
          }
        }

        const resStreak = await fetch("/api/me/streak", { cache: "no-store" });
        const dataStreak = await resStreak.json();
        if (dataStreak.success) setStreak(dataStreak.streak);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (authLoading || !currentUser) return;
    fetchData();
  }, [authLoading, currentUser]);

  const [deleteError, setDeleteError] = useState("");

  async function deleteSubmission(task: Task) {
    if (!window.confirm(`Delete your Week ${task.weekNumber} submission "${task.title}"? You can send a new one while the week is open.`)) return;
    setDeleteError("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error ?? "Could not delete the submission.");
        return;
      }
      setTasks((current) => current.filter((t) => t.id !== task.id));
    } catch {
      setDeleteError("Could not reach the server. Try again.");
    }
  }

  const evaluatedTasks = tasks.filter((t) => t.status === "evaluated");
  const pendingTasks = tasks.filter((t) => t.status === "submitted");
  // Members can submit only to an open week whose task their lead has posted.
  const isMember = currentUser?.role === "member";
  const canSubmitNow = isMember && Boolean(activeWeek?.isActive && prompt);
  const hasSubmittedActiveWeek = tasks.some((t) => t.weekId === activeWeek?.id);
  // Days until the lead's due date, or until the sprint week ends when no due date was set.
  const dueText = prompt?.dueDate ?? activeWeek?.endDate;
  const remaining = activeWeek?.isActive && dueText ? daysLeft(dueText) : null;
  const gradedTasks = [...evaluatedTasks]
    .filter((t) => t.evaluation)
    .sort((a, b) => new Date(b.evaluation!.evaluatedAt).getTime() - new Date(a.evaluation!.evaluatedAt).getTime());
  const averageScore = gradedTasks.length ? Math.round(gradedTasks.reduce((sum, t) => sum + t.evaluation!.score, 0) / gradedTasks.length) : null;

  return (
    <PortalAccessGate>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
        >
          <div className="relative overflow-hidden rounded-[28px] border border-sky-400/15 bg-[linear-gradient(135deg,rgba(13,24,38,0.92),rgba(10,18,29,0.85))] p-6 shadow-[0_25px_80px_rgba(2,6,23,0.8)] sm:p-8">
            <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute -left-8 bottom-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {activeWeek?.isActive ? `Sprint ${activeWeek.weekNumber} active cycle` : "No sprint open"}
                </div>
                <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                  Welcome back, <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">{currentUser?.name}</span>!
                </h1>
                <p className="max-w-xl text-sm text-slate-300">
                  You are competing in the <strong className="text-white">{currentUser?.domain}</strong> domain track. {activeWeek?.isActive ? `Week ${activeWeek.weekNumber} is open for submissions.` : "Submissions are closed until the next sprint week opens."}
                </p>
              </div>

              {canSubmitNow && (
                <Link
                  href="/portal/submit-task"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_16px_30px_rgba(52,211,153,0.22)] transition-transform hover:scale-[1.01]"
                >
                  <Send className="h-4 w-4" />
                  Submit task deliverable
                </Link>
              )}
            </div>
          </div>

          <AnnouncementFeed />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total points", value: currentUser?.points ?? 0, icon: Trophy, color: "amber" },
              { label: "Login streak", value: `${streak} ${streak === 1 ? "Day" : "Days"}`, icon: Flame, color: "rose" },
              { label: "Tasks evaluated", value: evaluatedTasks.length, icon: CheckCircle2, color: "emerald" },
              { label: "Pending review", value: pendingTasks.length, icon: Clock, color: "cyan" },
            ].map(({ label, value, icon: Icon, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-sky-300/10 bg-white/[0.04] p-5 shadow-[0_18px_50px_rgba(2,6,23,0.45)]"
              >
                <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">
                  <span>{label}</span>
                  <Icon className={`h-4 w-4 text-${color}-400`} />
                </div>
                <div className={`text-3xl font-black ${color === "amber" ? "text-amber-300" : color === "rose" ? "text-rose-300" : color === "emerald" ? "text-emerald-300" : "text-cyan-300"} font-mono`}>
                  {value}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">{label === "Pending review" ? "In evaluation queue" : "Live sprint metric"}</div>
              </motion.div>
            ))}
          </div>

          {activeWeek && (
            <div className="rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(14,25,38,0.95),rgba(9,18,30,0.9))] p-6 sm:p-8 shadow-[0_18px_50px_rgba(6,182,212,0.1)]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-300">
                    Club theme · Week {activeWeek.weekNumber}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{activeWeek.theme}</h2>
                  <p className="mt-1 text-xs font-mono text-slate-400">{activeWeek.title}</p>
                  {remaining !== null && !hasSubmittedActiveWeek && (
                    <p
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono ${
                        remaining <= 1 ? "border-rose-400/40 bg-rose-500/10 text-rose-200" : remaining <= 3 ? "border-amber-400/40 bg-amber-500/10 text-amber-200" : "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                      }`}
                    >
                      <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                      {describeDaysLeft(remaining)}
                      {prompt?.dueDate ? "" : " in this sprint week"}
                    </p>
                  )}
                </div>

                {!isMember ? null : hasSubmittedActiveWeek ? (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-mono text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Deliverable submitted
                  </span>
                ) : canSubmitNow ? (
                  <Link
                    href="/portal/submit-task"
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_16px_30px_rgba(6,182,212,0.25)]"
                  >
                    Submit week {activeWeek.weekNumber} task
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-mono text-slate-400">
                    {activeWeek.isActive ? "Waiting for your lead's task" : "Submissions closed"}
                  </span>
                )}
              </div>

              {activeWeek.promptDescription && (
                <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-slate-300">{activeWeek.promptDescription}</p>
              )}

              {activeWeek.isActive && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  {prompt ? (
                    <>
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                        Your {prompt.domain} task{prompt.dueDate ? ` · due ${prompt.dueDate}` : ""}
                      </div>
                      <div className="mt-1 text-lg font-bold text-white">{prompt.title}</div>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">{prompt.description}</p>
                    </>
                  ) : currentUser?.role === "domain_admin" ? (
                    <p className="text-sm text-amber-200">
                      You haven&apos;t posted the {currentUser.domain} task for this theme yet.{" "}
                      <Link href="/portal/tasks" className="font-semibold underline">Post it now</Link>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">Your {currentUser?.domain} lead hasn&apos;t posted this week&apos;s task yet. Check back soon.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {isMember && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Your sprint submissions</h2>
              <Link href="/portal/leaderboard" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                View leaderboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {deleteError && (
              <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{deleteError}</p>
            )}

            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="rounded-[24px] border border-sky-400/10 bg-white/[0.04] p-8 text-center text-sm text-slate-400">
                  No tasks submitted yet. Submit your first weekly task to enter the leaderboard.
                </div>
              ) : (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.45)]"
                  >
                    <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300">
                            Week {task.weekNumber}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">{task.domain}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{task.title}</h3>
                      </div>

                      {task.status === "evaluated" && task.evaluation ? (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-amber-300">
                          <Star className="h-4 w-4 fill-amber-300" />
                          <span className="font-mono text-sm font-bold">{task.evaluation.score} / 100</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-mono text-cyan-300">
                          <Clock className="h-3.5 w-3.5" />
                          Pending evaluation
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-slate-300">{task.description}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono">
                      {task.driveUrl && (
                        <a href={task.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                          <HardDrive className="h-3.5 w-3.5 text-emerald-300" />
                          Google Drive files
                        </a>
                      )}
                      {task.githubUrl && (
                        <a href={task.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5 text-slate-200">
                          <ExternalLink className="h-3.5 w-3.5 text-emerald-300" />
                          GitHub repo
                        </a>
                      )}
                      {task.liveUrl && (
                        <a href={task.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5 text-slate-200">
                          <ExternalLink className="h-3.5 w-3.5 text-cyan-300" />
                          Live demo
                        </a>
                      )}
                      {task.figmaUrl && (
                        <a href={task.figmaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5 text-slate-200">
                          <ExternalLink className="h-3.5 w-3.5 text-violet-300" />
                          Figma design
                        </a>
                      )}
                      {task.status === "submitted" && activeWeek?.isActive && task.weekId === activeWeek.id && (
                        <button
                          type="button"
                          onClick={() => deleteSubmission(task)}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-400/25 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete submission
                        </button>
                      )}
                    </div>

                  </motion.div>
                ))
              )}
            </div>
          </div>
          )}

          {isMember && (
          <section aria-labelledby="grades-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="grades-heading" className="flex items-center gap-2 text-xl font-bold text-white">
                <MessageSquareQuote className="h-5 w-5 text-emerald-300" aria-hidden="true" /> Grades &amp; feedback
              </h2>
              {averageScore !== null && <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">Average {averageScore} / 100</span>}
            </div>
            {gradedTasks.length === 0 ? (
              <div className="rounded-[24px] border border-sky-400/10 bg-white/[0.04] p-6 text-center text-sm text-slate-400">
                No graded work yet. Feedback from your lead shows up here once a task is evaluated.
              </div>
            ) : (
              <ul className="space-y-3">
                {gradedTasks.map((task) => (
                  <li key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300">Week {task.weekNumber}</span>
                        <h3 className="truncate text-base font-bold text-white">{task.title}</h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-mono text-sm font-bold text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-300" aria-hidden="true" /> {task.evaluation!.score} / 100
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-line break-words text-sm italic leading-6 text-slate-300">“{task.evaluation!.feedback}”</p>
                    <p className="mt-2 text-[11px] font-mono text-slate-500">
                      {task.evaluation!.adminName} · {new Date(task.evaluation!.evaluatedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}

