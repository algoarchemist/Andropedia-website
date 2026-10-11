"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Home, RefreshCw, WifiOff } from "lucide-react";
import { StatusPage } from "@/components/ui/StatusPage";
import { classifyError, retriesOnReconnect } from "@/lib/error-kind";
import { useOnline } from "@/lib/use-online";

// Shown when a page throws while loading or rendering. It tells three cases apart (see lib/error-kind.ts):
// no connection, a connection that dropped mid-load, and a real problem on our side. When the cause is the
// connection, the page tries again by itself the moment the browser is back online.
export default function GlobalRouteError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment. `reset` is the older name for clearing the error without a re-fetch. */
  retry?: () => void;
  reset: () => void;
}) {
  const online = useOnline();
  const kind = classifyError(error, online);
  const tryAgain = retry ?? reset;
  const autoRetried = useRef(false);

  useEffect(() => {
    console.error("Route error", kind, error.digest ?? "", error.message);
  }, [error, kind]);

  // Back online after being offline: reload once, without the visitor having to do anything.
  const wasOffline = useRef(!online);
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      autoRetried.current = false;
      return;
    }
    if (wasOffline.current && retriesOnReconnect(kind) && !autoRetried.current) {
      autoRetried.current = true;
      const t = window.setTimeout(tryAgain, 600);
      return () => window.clearTimeout(t);
    }
  }, [online, kind, tryAgain]);

  const connection = kind !== "server";
  const buttons = (
    <>
      <button type="button" onClick={tryAgain} className="btn-glow">
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
      <Link href="/" className="btn-ghost justify-center">
        <Home className="h-4 w-4" aria-hidden="true" />
        Back to home
      </Link>
    </>
  );

  if (connection) {
    return (
      <StatusPage
        code="OFF"
        eyebrow={kind === "offline" ? "No connection · Signal lost" : "Connection dropped"}
        title={kind === "offline" ? "You're offline" : "The connection dropped"}
        actions={buttons}
        footer={
          <p role="status" className="mt-8 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/50 lg:justify-start">
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            {kind === "offline" ? "Waiting for the network. This page reloads by itself when you are back." : "Reconnecting and trying again is safe."}
          </p>
        }
      >
        <p>
          {kind === "offline"
            ? "We can't reach the server from here. Check your Wi-Fi or mobile data."
            : "Part of this page didn't finish loading, usually because of a weak or interrupted signal."}{" "}
          Anything you were typing on the form is saved on this device.
        </p>
      </StatusPage>
    );
  }

  return (
    <StatusPage
      code="500"
      eyebrow="Error 500 · Glitch in the matrix"
      title="Something broke on our side"
      actions={buttons}
      footer={error.digest ? <p className="mt-8 font-mono text-[11px] text-white/40">Reference: {error.digest}</p> : undefined}
    >
      <div role="alert">
        <p>This page hit an unexpected problem. Nothing you submitted was lost. Try again, or head back home.</p>
      </div>
    </StatusPage>
  );
}
