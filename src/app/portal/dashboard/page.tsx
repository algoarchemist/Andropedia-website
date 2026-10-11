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
} from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { useAuth } from "@/lib/auth-context";
import { Task, Week } from "@/lib/types";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function DashboardPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
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
          setActiveWeek(current || dataWeeks.weeks[dataWeeks.weeks.length - 1]);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (authLoading || !currentUser) return;
    fetchData();
  }, [authLoading, currentUser]);

  const evaluatedTasks = tasks.filter((t) => t.status === "evaluated");
  const pendingTasks = tasks.filter((t) => t.status === "submitted");
  const hasSubmittedActiveWeek = tasks.some((t) => t.weekId === activeWeek?.id);

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
                  Sprint 4 active cycle
                </div>
                <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
                  Welcome back, <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">{currentUser?.name}</span>!
                </h1>
                <p className="max-w-xl text-sm text-slate-300">
                  You are competing in the <strong className="text-white">{currentUser?.domain}</strong> domain track. Evaluations for Week 4 are currently open.
                </p>
              </div>

              <Link
                href="/portal/submit-task"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_16px_30px_rgba(52,211,153,0.22)] transition-transform hover:scale-[1.01]"
              >
                <Send className="h-4 w-4" />
                Submit task deliverable
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total points", value: currentUser?.points || 382, icon: Trophy, color: "amber" },
              { label: "Active streak", value: `${currentUser?.streakWeeks || 4} Weeks`, icon: Flame, color: "rose" },
              { label: "Tasks evaluated", value: evaluatedTasks.length || currentUser?.tasksCompleted || 4, icon: CheckCircle2, color: "emerald" },
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
                    Active challenge · Week {activeWeek.weekNumber}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{activeWeek.title}</h2>
                  <p className="mt-1 text-xs font-mono text-slate-400">Theme: {activeWeek.theme}</p>
                </div>

                {hasSubmittedActiveWeek ? (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-mono text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Deliverable submitted
                  </span>
                ) : (
                  <Link
                    href="/portal/submit-task"
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_16px_30px_rgba(6,182,212,0.25)]"
                  >
                    Submit week {activeWeek.weekNumber} task
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-slate-300">
                {activeWeek.promptDescription || "Finalize your production deployment, write clean documentation, and ensure all live links and repositories are publicly accessible."}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Your sprint submissions</h2>
              <Link href="/portal/leaderboard" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                View leaderboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

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
                    </div>

                    {task.evaluation && (
                      <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-slate-900/80 p-4">
                        <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                          <span>Evaluator: {task.evaluation.adminName}</span>
                          <span>{new Date(task.evaluation.evaluatedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm italic leading-relaxed text-slate-300">“{task.evaluation.feedback}”</p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}

