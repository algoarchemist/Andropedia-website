"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Trophy,
  Crown,
  Flame,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { MemberAvatar } from "@/components/portal/MemberEditor";
import { LeaderboardEntry } from "@/lib/types";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { useAuth } from "@/lib/auth-context";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [domain, setDomain] = useState("All");
  const [period, setPeriod] = useState("all-time");
  const [searchQuery, setSearchQuery] = useState("");
  const { currentUser, isLoading: authLoading } = useAuth();

  const domains = ["All", "Web", "Technical", "R&D", "Design", "Media", "PR"];

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard?domain=${encodeURIComponent(domain)}&period=${period}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.leaderboard);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    }
  };

  useEffect(() => {
    if (authLoading || !currentUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeaderboard();
  }, [authLoading, currentUser, domain, period]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#34d399", "#67e8f9", "#fbbf24", "#8b5cf6"],
    });
  };

  const filtered = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = filtered.slice(0, 3);

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
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.24em] text-amber-300">
              <Trophy className="h-3.5 w-3.5" />
              Official sprint rankings
            </div>
            <h1 className="text-4xl font-black text-white sm:text-5xl">
              Club <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-300 bg-clip-text text-transparent">Leaderboard</span>
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Dynamic rankings based on weekly submissions, rubric scores, and sprint consistency.
            </p>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-[26px] border border-sky-400/10 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(2,6,23,0.45)] lg:flex-row">
            <div className="flex flex-wrap items-center gap-1.5">
              {domains.map((d) => (
                <button
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-mono transition-all ${
                    domain === d
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-bold shadow-[0_10px_20px_rgba(52,211,153,0.2)]"
                      : "border border-white/5 bg-slate-900/70 text-slate-300 hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 p-1 text-xs font-mono">
                {[
                  { key: "all-time", label: "All-Time" },
                  { key: "weekly", label: "This week" },
                  { key: "monthly", label: "Monthly" },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setPeriod(option.key)}
                    className={`rounded-lg px-3 py-1.5 ${
                      period === option.key ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search member..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {topThree.length >= 3 && (
            <div className="pt-2">
              <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                {[topThree[1], topThree[0], topThree[2]].map((entry, index) => (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    onClick={triggerConfetti}
                    className={`cursor-pointer rounded-[28px] border p-4 sm:p-6 text-center transition-transform hover:scale-[1.01] ${
                      index === 1
                        ? "border-amber-400/40 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),transparent_60%)] shadow-[0_18px_60px_rgba(251,191,36,0.12)]"
                        : index === 0
                          ? "border-slate-300/30 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.14),transparent_60%)]"
                          : "border-amber-700/35 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.12),transparent_60%)]"
                    }`}
                  >
                    <div className="relative mx-auto mb-4 flex w-fit items-center justify-center">
                      <MemberAvatar
                        member={entry}
                        className={`rounded-full border-2 ${
                          index === 1 ? "h-24 w-24 border-amber-300 sm:h-28 sm:w-28" : index === 0 ? "h-20 w-20 border-slate-200 sm:h-24 sm:w-24" : "h-20 w-20 border-amber-700 sm:h-24 sm:w-24"
                        }`}
                      />
                      <div className={`absolute -bottom-2 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                        index === 1 ? "bg-amber-400 text-slate-950" : index === 0 ? "bg-slate-300 text-slate-950" : "bg-amber-700 text-amber-50"
                      }`}>
                        {index === 1 ? 1 : index === 0 ? 2 : 3}
                      </div>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-base font-bold text-white sm:text-lg">{entry.name}</h3>
                      <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-slate-300">
                        {entry.domain}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="text-2xl font-black text-amber-300 font-mono sm:text-3xl">{entry.totalScore}</div>
                      <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Points</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(2,6,23,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Full standings</h2>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">{filtered.length} contenders</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-6 py-4 text-center">Tasks</th>
                    <th className="px-6 py-4 text-center">Streak</th>
                    <th className="px-6 py-4 text-center">Avg</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                            entry.rank === 1 ? "bg-amber-400 text-slate-950" : entry.rank === 2 ? "bg-slate-300 text-slate-950" : entry.rank === 3 ? "bg-amber-700 text-amber-50" : "bg-slate-800 text-slate-300"
                          }`}>
                            #{entry.rank}
                          </span>
                          {entry.rankChange > 0 ? (
                            <span className="flex items-center text-xs text-emerald-300"><ArrowUp className="h-3 w-3" />{entry.rankChange}</span>
                          ) : entry.rankChange < 0 ? (
                            <span className="flex items-center text-xs text-rose-300"><ArrowDown className="h-3 w-3" />{Math.abs(entry.rankChange)}</span>
                          ) : (
                            <span className="text-slate-600"><Minus className="h-3 w-3" /></span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={entry} className="h-10 w-10 rounded-xl border border-white/10" />
                          <div>
                            <div className="flex items-center gap-2 font-bold text-white">
                              <span>{entry.name}</span>
                              {entry.rank === 1 && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                            </div>
                            <div className="mt-1 flex gap-1">
                              {entry.badges.slice(0, 2).map((badge) => (
                                <span key={badge} className="rounded bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-mono text-slate-400">{badge}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-mono text-slate-300">{entry.domain}</span>
                      </td>

                      <td className="px-6 py-4 text-center font-mono text-slate-300">{entry.tasksCompleted}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-300">
                          <Flame className="h-3 w-3" />
                          {entry.streakDays}d
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-semibold text-emerald-300">{entry.avgScore}%</td>
                      <td className="px-6 py-4 text-right font-mono text-lg font-black text-amber-300">{entry.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </PortalAccessGate>
  );
}

