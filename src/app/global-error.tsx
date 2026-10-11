"use client";

import { useEffect } from "react";

// The last resort: used only when the root layout itself fails, so it replaces the whole document and can't rely on the
// site's components or styles. Plain markup with inline styles on purpose.
export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error", error.digest ?? "", error.message);
  }, [error]);

  const tryAgain = retry ?? reset;
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: 440 }}>
          <p style={{ margin: 0, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8cbfff" }}>
            Error · Signal lost
          </p>
          <h1 style={{ margin: "16px 0 12px", fontSize: 32, lineHeight: 1.15 }}>Andropedia hit a snag</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            Something went wrong while loading the site. Check your connection and try again.
          </p>
          {error.digest && <p style={{ marginTop: 16, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Reference: {error.digest}</p>}
          <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={tryAgain}
              style={{ padding: "12px 22px", borderRadius: 4, border: "1px solid #0066ff", background: "#0052cc", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Try again
            </button>
            {/* a plain link on purpose: next/link needs the app that just failed, this reloads the whole thing */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ padding: "12px 22px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.4)", color: "#fff", textDecoration: "none" }}>
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
