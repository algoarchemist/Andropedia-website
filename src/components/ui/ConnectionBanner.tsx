"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOnline } from "@/lib/use-online";

/**
 * A small pill at the bottom of every page: "You're offline" while the connection is gone, then "Back online" for a few
 * seconds. Pages that load their data in the browser (the team, events) can't show it themselves, so this explains why
 * their content didn't load, before anyone sees a broken page.
 */
export function ConnectionBanner() {
  const online = useOnline();
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onOnline = () => {
      setBackOnline(true);
      timer = window.setTimeout(() => setBackOnline(false), 3500);
    };
    const onOffline = () => {
      window.clearTimeout(timer);
      setBackOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearTimeout(timer);
    };
  }, []);

  if (online && !backOnline) return null;
  const Icon = online ? Wifi : WifiOff;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-4 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] backdrop-blur-md ${
        online ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border-amber-400/40 bg-amber-500/15 text-amber-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {online ? "Back online" : "You're offline. Some content may not load."}
    </div>
  );
}
