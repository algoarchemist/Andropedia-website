"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Clock,
  ExternalLink,
  CheckCircle2,
  HardDrive,
  Trash2,
} from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { MemberAvatar } from "@/components/portal/MemberEditor";
import { useAuth } from "@/lib/auth-context";
import { Task } from "@/lib/types";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";

export default function EvaluationsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Sliders start at 0 and reset whenever another submission is picked, so a grade is always a conscious choice.
  const [technicalDepth, setTechnicalDepth] = useState(0);
  const [innovation, setInnovation] = useState(0);
  const [completion, setCompletion] = useState(0);
  const [documentation, setDocumentation] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const totalScore = technicalDepth + innovation + completion + documentation;

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        const pending = data.tasks.find((t: Task) => t.status === "submitted");
        if (pending && !selectedTask) {
          setSelectedTask(pending);
        }
      }
    } catch (err) {
      console.error("Error fetching evaluation queue:", err);
    }
  };

  useEffect(() => {
    if (authLoading || !currentUser || (currentUser.role !== "domain_admin" && currentUser.role !== "super_admin")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [authLoading, currentUser]);

  const handleDelete = async (task: Task) => {
    const warning =
      task.status === "evaluated" && task.evaluation
        ? `Delete ${task.userName}'s Week ${task.weekNumber} submission? Its ${task.evaluation.score} points will be taken off their total.`
        : `Delete ${task.userName}'s Week ${task.weekNumber} submission? They can send a new one while the week is open.`;
    if (!window.confirm(warning)) return;
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error ?? "Could not delete the submission.");
        return;
      }
      setSelectedTask((current) => (current?.id === task.id ? null : current));
      setTasks((current) => current.filter((t) => t.id !== task.id));
      setSuccessMsg("Submission deleted.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Could not reach the server. Try again.");
    }
  };

  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setEvalSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          score: totalScore,
          feedback,
          criteriaScores: {
            technicalDepth,
            innovation,
            completion,
            documentation,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Task "${selectedTask.title}" successfully graded with ${totalScore} pts!`);
        fetchTasks();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error ?? "Could not save the grade.");
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      setErrorMsg("Could not reach the server. Try again.");
    } finally {
      setEvalSubmitting(false);
    }
  };

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
          <div className="flex flex-col justify-between gap-4 border-b border-sky-400/10 pb-6 md:flex-row md:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">
                <CheckSquare className="h-3.5 w-3.5" />
                Domain evaluation engine
              </div>
              <h1 className="text-3xl font-black text-white">Sprint deliverable evaluations</h1>
              <p className="mt-2 text-xs text-slate-400">Review codebases, score deliverables, and provide constructive feedback.</p>
            </div>

            <Link href="/portal/leaderboard" className="inline-flex items-center gap-2 self-start rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-2 text-xs font-semibold text-cyan-300">
              <span>View leaderboard</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {errorMsg && (
            <div role="alert" className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMsg}</div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Submissions queue ({tasks.length})</h2>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300">Click to inspect</span>
              </div>

              <div className="max-h-[700px] space-y-3 overflow-y-auto pr-1">
                {tasks.map((task) => {
                  const isSelected = selectedTask?.id === task.id;
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        const graded = task.evaluation?.criteriaScores;
                        setFeedback(task.evaluation?.feedback ?? "");
                        setTechnicalDepth(graded?.technicalDepth ?? 0);
                        setInnovation(graded?.innovation ?? 0);
                        setCompletion(graded?.completion ?? 0);
                        setDocumentation(graded?.documentation ?? 0);
                      }}
                      className={`cursor-pointer rounded-[22px] border p-4 transition-all ${
                        isSelected ? "border-emerald-400/40 bg-emerald-500/10 shadow-[0_12px_30px_rgba(52,211,153,0.12)]" : "border-white/10 bg-white/[0.04] hover:border-sky-400/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={{ name: task.userName, avatar: task.userAvatar }} className="h-10 w-10 rounded-full border border-white/10" />
                          <div>
                            <div className="text-sm font-bold text-white">{task.userName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{task.domain} · Week {task.weekNumber}</div>
                          </div>
                        </div>

                        {task.status === "evaluated" && task.evaluation ? (
                          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">{task.evaluation.score} pts</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>

                      <h4 className="mt-3 text-xs font-semibold text-slate-200">{task.title}</h4>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7">
              {selectedTask ? (
                <div className="rounded-[28px] border border-sky-400/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.45)] sm:p-8">
                  <div className="border-b border-white/10 pb-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300">
                        {selectedTask.domain} · Week {selectedTask.weekNumber}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-slate-400">Submitted {new Date(selectedTask.submittedAt).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedTask)}
                          aria-label={`Delete ${selectedTask.userName}'s submission`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white">{selectedTask.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{selectedTask.description}</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex flex-wrap gap-3">
                      {selectedTask.driveUrl && (
                        <a href={selectedTask.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-mono text-emerald-200">
                          <HardDrive className="h-3.5 w-3.5 text-emerald-300" />
                          Google Drive files
                        </a>
                      )}
                      {selectedTask.githubUrl && (
                        <a href={selectedTask.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[11px] font-mono text-slate-200">
                          <ExternalLink className="h-3.5 w-3.5 text-emerald-300" />
                          GitHub repo
                        </a>
                      )}
                      {selectedTask.liveUrl && (
                        <a href={selectedTask.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[11px] font-mono text-slate-200">
                          <ExternalLink className="h-3.5 w-3.5 text-cyan-300" />
                          Live demo
                        </a>
                      )}
                    </div>

                    <form onSubmit={handleEvaluateSubmit} className="space-y-6">
                      <div className="space-y-3">
                        {[{ label: "Technical Depth", value: technicalDepth, setValue: setTechnicalDepth }, { label: "Innovation", value: innovation, setValue: setInnovation }, { label: "Completion", value: completion, setValue: setCompletion }, { label: "Documentation", value: documentation, setValue: setDocumentation }].map((metric) => (
                          <div key={metric.label}>
                            <div className="mb-2 flex items-center justify-between text-xs font-mono text-slate-300">
                              <span>{metric.label}</span>
                              <span className="text-emerald-300">{metric.value}/25</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={25}
                              value={metric.value}
                              onChange={(e) => metric.setValue(Number(e.target.value))}
                              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-400"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-mono text-slate-300">
                          <span>Feedback</span>
                          <span className="text-amber-300">Total: {totalScore}/100</span>
                        </div>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={5}
                          placeholder="Provide structured, actionable feedback for the member..."
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={evalSubmitting}
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_16px_30px_rgba(34,211,238,0.3)] disabled:opacity-60"
                      >
                        {evalSubmitting ? "Submitting score..." : "Submit evaluation"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">No submission selected.</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}
