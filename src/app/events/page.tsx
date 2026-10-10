"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BlurOrb, GridLines } from "@/components/design/Backdrop";
import { Calendar, MapPin, Trophy, Sparkles, Check, X, Loader2, Images } from "lucide-react";
import { TeamDialog } from "@/components/events/TeamDialog";
import { EventDetailDialog } from "@/components/events/EventDetailDialog";
import { galleryFor } from "@/content/event-gallery";
import type { EventStatus, PublicEvent } from "@/lib/events";

const BADGE: Record<EventStatus, { label: string; color: string }> = {
  open: { label: "Registrations Open", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  full: { label: "Full", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  closed: { label: "Reservations Closed", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  past: { label: "Completed", color: "bg-slate-700 text-slate-300 border-slate-600" },
};

const STORAGE_KEY = "andropedia_rsvps";

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" });

function when(e: PublicEvent) {
  if (e.dateTbc) return "Date to be announced";
  const start = new Date(e.startsAt);
  if (!e.endsAt) return dateFmt.format(start);
  const end = new Date(e.endsAt);
  return dayFmt.format(start) === dayFmt.format(end) ? `${dateFmt.format(start)} - ${end.toLocaleTimeString("en-IN", { timeStyle: "short", timeZone: "Asia/Kolkata" })}` : `${dayFmt.format(start)} - ${dayFmt.format(end)}`;
}

function loadReserved(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveReserved(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable: the reservation is still saved on the server */
  }
}

function RsvpDialog({ event, onClose, onDone }: { event: PublicEvent; onClose: () => void; onDone: (id: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDone(true);
        onDone(event.id);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-emerald-400/60 focus:outline-none";

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Reserve a seat for ${event.title}`}
        className="glass-card relative w-full max-w-md p-7"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/5 p-2 text-white/70 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="space-y-3 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"><Check className="h-6 w-6" /></div>
            <h2 className="text-xl font-bold text-white">Your seat is reserved</h2>
            <p className="text-sm text-white/70">{event.title}<br />{when(event)}</p>
            <p className="text-xs text-white/50">A confirmation email is on its way to {email}.</p>
            <button type="button" onClick={onClose} className="btn-ghost mt-2">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <h2 className="pr-8 text-xl font-bold text-white">Reserve your seat</h2>
              <p className="mt-1 text-sm text-white/60">{event.title}</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-white/70">Full name</span>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} placeholder="Your name" autoFocus />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-white/70">Email</span>
              <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={160} placeholder="you@example.com" />
            </label>
            {/* Honeypot: hidden from people, irresistible to bots. */}
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute left-[-9999px] h-0 w-0 opacity-0" name="website" />
            {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Reserving...</> : <><Sparkles className="h-4 w-4" /> Reserve seat</>}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Events() {
  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [, setReserved] = useState<string[]>([]);
  const [dialogFor, setDialogFor] = useState<PublicEvent | null>(null);
  const [detailFor, setDetailFor] = useState<PublicEvent | null>(null);

  const load = useCallback(() => {
    fetch("/api/events", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d.success ? (setEvents(d.events), setLoadError(false)) : setLoadError(true)))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    load();
    // Read the browser-only list after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReserved(loadReserved());
  }, [load]);

  const markReserved = (id: string) => {
    setReserved((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      saveReserved(next);
      return next;
    });
    load(); // refresh seat counts
  };

  const upcoming = (events ?? []).filter((e) => e.status !== "past");
  // Past events: dated ones newest first, then the ones with no date yet in the order they were added.
  const past = (events ?? [])
    .filter((e) => e.status === "past")
    .sort((a, b) =>
      a.dateTbc !== b.dateTbc
        ? a.dateTbc ? 1 : -1
        : a.dateTbc ? Date.parse(a.startsAt) - Date.parse(b.startsAt) : Date.parse(b.startsAt) - Date.parse(a.startsAt)
    );
  const currentList = activeTab === "upcoming" ? upcoming : past;

  const tab = (id: "upcoming" | "past", label: string, count: number) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
        activeTab === id ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20" : "glass-panel text-slate-300 hover:text-white"
      }`}
    >
      {label} ({count})
    </button>
  );

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-black text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <GridLines variant="hero" />
      <BlurOrb variant="features" size={800} opacity={0.35} position={{ left: "50%", top: "360px" }} />
      <div className="relative max-w-7xl mx-auto space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="chip">
            <Calendar className="w-3.5 h-3.5" />
            HACKATHONS & WORKSHOPS
          </div>
          <h1 className="text-[40px] sm:text-[60px] font-medium leading-[1.05] tracking-[-2px] sm:tracking-[-3px]">
            <span className="text-fade">Events &</span> <span className="text-aurora">hackathons</span>
          </h1>
          <p className="text-white/70 text-base leading-6">
            Participate in flagship hackathons, intense algorithmic battles, and technical workshops organized by Andropedia.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {tab("upcoming", "Upcoming Events", upcoming.length)}
          {tab("past", "The Archive", past.length)}
        </div>
        {activeTab === "past" && (
          <p className="-mt-4 text-center text-xs font-mono uppercase tracking-[0.18em] text-emerald-300/70">
            Dream. Design. Develop. · Where we&apos;ve been
          </p>
        )}

        {loadError && <p role="alert" className="text-center text-sm text-amber-300">We could not load events right now. Please refresh in a moment.</p>}
        {!events && !loadError && <p className="text-center text-xs font-mono uppercase tracking-[0.18em] text-slate-500">Loading events...</p>}
        {events && currentList.length === 0 && (
          <p className="mx-auto max-w-5xl rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-white/50">
            {activeTab === "upcoming" ? "No upcoming events right now. Check back soon." : "No past events yet."}
          </p>
        )}

        <div className="space-y-6 max-w-5xl mx-auto">
          {currentList.map((ev) => {
            const badge = BADGE[ev.status];
            const photos = galleryFor(ev.id).length;
            const open = photos > 0 ? () => setDetailFor(ev) : undefined;
            return (
              <div
                key={ev.id}
                className={`glass-panel p-8 rounded-3xl border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${open ? "cursor-pointer" : ""}`}
                data-cursor-text={open ? "View photos" : "Event"}
                onClick={open}
                onKeyDown={open && ((e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open()))}
                role={open ? "button" : undefined}
                tabIndex={open ? 0 : undefined}
                aria-label={open ? `${ev.title}: view event photos` : undefined}
              >
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-400 uppercase">{ev.type}</span>
                    <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white hover:text-emerald-300 transition-colors">{ev.title}</h2>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{ev.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono pt-2">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-400" /><span>{when(ev)}</span></div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-400" /><span>{ev.location}</span></div>
                    {ev.prize && (
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold"><Trophy className="w-3.5 h-3.5" /><span>{ev.prize}</span></div>
                    )}
                  </div>
                  {photos > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 text-xs font-mono text-emerald-300/80"><Images className="w-3.5 h-3.5" /><span>{photos} photos · click to view</span></div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {detailFor && <EventDetailDialog event={detailFor} when={when(detailFor)} onClose={() => setDetailFor(null)} />}
        {dialogFor && (dialogFor.teamMax != null
          ? <TeamDialog event={dialogFor} onClose={() => setDialogFor(null)} onDone={markReserved} />
          : <RsvpDialog event={dialogFor} onClose={() => setDialogFor(null)} onDone={markReserved} />)}
      </AnimatePresence>
    </div>
  );
}
