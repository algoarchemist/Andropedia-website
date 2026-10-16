"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

interface Item {
  id: string;
  title: string;
  body: string;
  domain: string;
  authorName: string;
  createdAt: string;
  isNew: boolean;
}

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const SHOWN = 5;

/** Messages from the member's leads, newest first. Ones they have not seen carry a "New" badge; opening the dashboard marks them seen. */
export function AnnouncementFeed() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) return setItems([]);
        const list: Item[] = data.announcements.slice(0, SHOWN);
        setItems(list); // shown with their badges first...
        const fresh = list.filter((a) => a.isNew).map((a) => a.id);
        // ...then marked seen, so they are not "new" again on the next visit.
        if (fresh.length) {
          await fetch("/api/announcements/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: fresh }) });
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section aria-labelledby="announcements-heading" className="space-y-3">
      <h2 id="announcements-heading" className="flex items-center gap-2 text-xl font-bold text-white">
        <Megaphone className="h-5 w-5 text-amber-300" aria-hidden="true" /> Announcements
      </h2>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className={`rounded-2xl border p-5 ${a.isNew ? "border-amber-400/40 bg-amber-500/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
            <div className="flex flex-wrap items-center gap-2">
              {a.isNew && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">New</span>}
              <h3 className="text-base font-bold text-white">{a.title}</h3>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">{a.domain === "All" ? "Everyone" : a.domain}</span>
            </div>
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-200">{a.body}</p>
            <p className="mt-2 text-[11px] font-mono text-slate-500">
              {a.authorName} · {fmt.format(new Date(a.createdAt))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
