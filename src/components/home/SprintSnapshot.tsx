import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlurOrb } from "@/components/design/Backdrop";
import { Reveal } from "@/components/design/Reveal";
import { CountUp } from "@/components/design/scroll";
import { getLeaderboard, getPublicMembers, getWeeks } from "@/lib/data-store";
import { featuredLeaders, initialsOf } from "@/lib/home-board";
import { log } from "@/lib/logger";

interface BoardEntry {
  rank: number;
  name: string;
  /** Under the name on the podium. */
  role: string;
  domain: string;
  avatar: string;
  points: string;
}

/** Profile picture, or the person's initials when they have none. */
function Face({ name, src, className }: { name: string; src: string; className: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${className} object-cover`} />;
  }
  return (
    <div role="img" aria-label={name} className={`${className} flex items-center justify-center bg-[#0b1d4d] font-semibold text-[#8cbfff]`}>
      {initialsOf(name)}
    </div>
  );
}

const SPRINT_FALLBACK = 4;

// The board: the President, the Vice President and the R&D Chief hold the top three places (with placeholder Andro Points
// between 300 and 400 until real sprint scores exist, see lib/home-board.ts). Members who have real scores follow below them.
export async function SprintSnapshot() {
  let sprintNumber = SPRINT_FALLBACK;
  let leaders: ReturnType<typeof featuredLeaders> = [];
  let scored: Awaited<ReturnType<typeof getLeaderboard>> = [];

  try {
    const [members, board, weeks] = await Promise.all([getPublicMembers(), getLeaderboard("All", "all-time"), getWeeks()]);
    leaders = featuredLeaders(members);
    scored = board.filter((r) => r.totalScore > 0);
    const active = weeks.find((w) => w.isActive);
    if (active) sprintNumber = active.weekNumber;
  } catch (err) {
    log.error("Home leaderboard fetch error", err);
  }

  const leaderIds = new Set(leaders.map((l) => l.id));
  const entries: BoardEntry[] = [
    ...leaders.map((l) => ({ name: l.name, role: l.title, domain: l.domain, avatar: l.avatar, points: l.points })),
    ...scored.filter((r) => !leaderIds.has(r.userId)).map((r) => ({ name: r.name, role: `${r.domain} Contributor`, domain: r.domain, avatar: r.avatar, points: r.totalScore })),
  ]
    .slice(0, 5)
    .map((e, i) => ({ rank: i + 1, name: e.name, role: e.role, domain: e.domain, avatar: e.avatar, points: e.points.toLocaleString("en-US") }));

  const ledgerData = entries.map((e) => ({ ...e, points: `${e.points} pts` }));
  const [card1, card2, card3] = entries;

  if (entries.length === 0) return null; // nothing to show yet (no leadership set and no scores)

  return (
    <section id="sprint" className="relative isolate overflow-hidden bg-black px-4 py-16 sm:px-8 sm:py-20 lg:px-12">
      <BlurOrb variant="hero" size={900} opacity={0.3} position={{ left: "50%", top: "50%" }} />

      <Reveal className="relative mx-auto max-w-[1100px]">
        {/* ── Single Merged Board Container ── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-[#0066ff]/25 bg-[#050917]/90 p-5 shadow-[0_0_60px_rgba(0,102,255,0.15)] backdrop-blur-xl sm:p-8 lg:p-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0, 102, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 102, 255, 0.05) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(circle at 50% 15%, rgba(0, 102, 255, 0.15), transparent 70%)",
            }}
          />

          {/* ── Top 3 Podium Cards ── */}
          <div className="relative z-10 grid grid-cols-1 items-end gap-5 sm:grid-cols-3 sm:gap-4 lg:gap-6">
            {/* #2 — Left Card */}
            {card2 && (
            <div className="order-2 flex flex-col items-center sm:order-1">
              <div className="relative mb-[-16px] z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0066ff] bg-[#070e24] font-mono text-[12px] font-bold text-[#38bdf8] shadow-[0_0_15px_rgba(0,102,255,0.5)]">
                2
              </div>
              <div className="relative flex w-full flex-col items-center overflow-hidden rounded-xl border border-[#0066ff]/25 bg-[#08122c]/70 px-4 pb-5 pt-7 text-center backdrop-blur-md transition-all duration-300 hover:border-[#0066ff]/50 sm:h-[260px]">
                {/* Avatar */}
                <div className="relative h-16 w-16 shrink-0 rounded-full border-2 border-[#0066ff]/50 p-0.5 shadow-[0_0_20px_rgba(0,102,255,0.35)]">
                  <Face name={card2.name} src={card2.avatar} className="h-full w-full rounded-full" />
                </div>
                {/* Info */}
                <h3 className="mt-3 font-semibold text-white text-[15px] sm:text-[16px]">{card2.name}</h3>
                <p className="mt-0.5 text-[11px] font-medium text-[#38bdf8] sm:text-[12px]">{card2.role}</p>
                {/* Andro Points */}
                <div className="mt-auto pt-3">
                  <div className="font-mono text-[20px] font-bold text-white sm:text-[22px]">
                    <CountUp value={card2.points} /> <span className="text-[12px] font-medium text-[#38bdf8]">Andro Points</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* #1 — Center Card (Elevated) */}
            {card1 && (
            <div className="order-1 flex flex-col items-center sm:order-2">
              <div className="relative mb-[-18px] z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#00d4ff] bg-[#071330] font-mono text-[14px] font-bold text-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.7)]">
                1
              </div>
              <div className="relative flex w-full flex-col items-center overflow-hidden rounded-xl border border-[#00d4ff]/40 bg-[#0a183c]/85 px-4 pb-6 pt-8 text-center shadow-[0_0_35px_rgba(0,102,255,0.25)] backdrop-blur-md transition-all duration-300 hover:border-[#00d4ff]/70 sm:h-[300px]">
                {/* Glowing Aura */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-28"
                  style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,212,255,0.2), transparent 75%)" }}
                />

                {/* Avatar with Ring */}
                <div className="relative h-20 w-20 shrink-0 rounded-full border-2 border-[#00d4ff] p-0.5 shadow-[0_0_25px_rgba(0,212,255,0.5)]">
                  <Face name={card1.name} src={card1.avatar} className="h-full w-full rounded-full" />
                </div>

                {/* Info */}
                <h3 className="mt-2 text-[17px] font-bold text-white sm:text-[18px]">{card1.name}</h3>
                <p className="mt-0.5 text-[12px] font-medium text-[#00d4ff] sm:text-[13px]">{card1.role}</p>

                {/* Andro Points */}
                <div className="mt-auto pt-3">
                  <div className="font-mono text-[24px] font-black text-[#00d4ff] sm:text-[26px]">
                    <CountUp value={card1.points} /> <span className="text-[13px] font-semibold text-white/70">Andro Points</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* #3 — Right Card */}
            {card3 && (
            <div className="order-3 flex flex-col items-center">
              <div className="relative mb-[-16px] z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0066ff] bg-[#070e24] font-mono text-[12px] font-bold text-[#38bdf8] shadow-[0_0_15px_rgba(0,102,255,0.5)]">
                3
              </div>
              <div className="relative flex w-full flex-col items-center overflow-hidden rounded-xl border border-[#0066ff]/25 bg-[#08122c]/70 px-4 pb-5 pt-7 text-center backdrop-blur-md transition-all duration-300 hover:border-[#0066ff]/50 sm:h-[250px]">
                {/* Avatar */}
                <div className="relative h-16 w-16 shrink-0 rounded-full border-2 border-[#0066ff]/50 p-0.5 shadow-[0_0_20px_rgba(0,102,255,0.35)]">
                  <Face name={card3.name} src={card3.avatar} className="h-full w-full rounded-full" />
                </div>
                {/* Info */}
                <h3 className="mt-3 font-semibold text-white text-[15px] sm:text-[16px]">{card3.name}</h3>
                <p className="mt-0.5 text-[11px] font-medium text-[#38bdf8] sm:text-[12px]">{card3.role}</p>
                {/* Andro Points */}
                <div className="mt-auto pt-3">
                  <div className="font-mono text-[20px] font-bold text-white sm:text-[22px]">
                    <CountUp value={card3.points} /> <span className="text-[12px] font-medium text-[#38bdf8]">Andro Points</span>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* ── Ranking Ledger Table with Andro Points Column and 5 Circles ── */}
          <div className="relative z-10 mt-8 overflow-hidden rounded-xl border border-[#0066ff]/20 bg-[#070e24]/80 backdrop-blur-md sm:mt-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#0066ff]/20 bg-[#0066ff]/[0.06] px-4 py-3 sm:px-6">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#38bdf8] sm:text-[12px]">
                LIVE SPRINT {String(sprintNumber).padStart(2, "0")} RANKING LEDGER
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
                SYNCED VIA COMMIT MESH
              </span>
            </div>

            {/* Column Headers (Verified Commits & Guild XP removed, combined into Andro Points) */}
            <div className="grid grid-cols-[60px_1.5fr_1.2fr_130px] items-center gap-2 border-b border-white/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 sm:px-6">
              <span>RANK</span>
              <span>CONTRIBUTOR</span>
              <span>DOMAIN TRACK</span>
              <span className="text-right">ANDRO POINTS</span>
            </div>

            {/* Rows with 5 Circles for Ranks */}
            <div className="divide-y divide-white/[0.04]">
              {ledgerData.map((row, idx) => (
                <div
                  key={row.rank + row.name}
                  className="grid grid-cols-[60px_1.5fr_1.2fr_130px] items-center gap-2 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:px-6"
                >
                  {/* Rank Circle Badge */}
                  <div>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[12px] font-bold ${
                        idx === 0
                          ? "border-2 border-[#00d4ff] bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.5)]"
                          : idx === 1
                          ? "border-2 border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                          : idx === 2
                          ? "border-2 border-[#60a5fa] bg-[#60a5fa]/15 text-[#60a5fa] shadow-[0_0_10px_rgba(96,165,250,0.3)]"
                          : "border border-white/20 bg-white/5 text-white/60"
                      }`}
                    >
                      {row.rank}
                    </div>
                  </div>

                  {/* Contributor */}
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Face name={row.name} src={row.avatar} className="h-7 w-7 shrink-0 rounded-full border border-white/15 text-[10px]" />
                    <span className="truncate text-[13px] font-medium text-white">{row.name}</span>
                  </div>

                  {/* Domain */}
                  <span className="truncate text-[12px] font-medium text-[#38bdf8]">{row.domain}</span>

                  {/* Andro Points Single Column */}
                  <span className="text-right font-mono text-[13px] font-bold text-white sm:text-[14px]">
                    {row.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recruitment call to action ── */}
          <div className="relative z-10 mt-8 flex flex-col items-center gap-3 text-center sm:mt-10">
            <p className="text-[13px] text-white/60 sm:text-[14px]">Want your name on this board? Recruitment is open.</p>
            <Link href="/join" className="btn-glow" data-cursor-text="Join">
              Join now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
