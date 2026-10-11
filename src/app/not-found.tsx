import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { StatusPage } from "@/components/ui/StatusPage";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

const QUICK_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/team", label: "Teams" },
  { href: "/projects", label: "Projects" },
];

// A real 404: the address does not match any page of the site. Failures caused by the connection or by a crash
// never come here; see error.tsx, which tells "offline" and "server error" apart.
export default function NotFound() {
  return (
    <StatusPage
      code="404"
      eyebrow="Error 404 · Signal lost"
      title="This page wandered off"
      actions={
        <>
          <Link href="/" className="btn-glow">
            <Home className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          <Link href="/join" className="btn-ghost justify-center">
            Join Andropedia
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </>
      }
      footer={
        <nav aria-label="Popular pages" className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Or try</span>
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-[0.14em] text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      }
    >
      <p>Our mascot sniffed around every corner of the site and came back empty-pawed. The link may be old, or the address mistyped.</p>
    </StatusPage>
  );
}
