"use client";

import { ClipboardCheck } from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { ApplicantsReview } from "@/components/portal/ApplicantsReview";
import { useAuth } from "@/lib/auth-context";

export default function ApplicationsPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "super_admin";

  return (
    <PortalAccessGate allowedRoles={["domain_admin", "super_admin"]}>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-300">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Recruitment
            </div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">Applications</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {isAdmin
                ? "Every application from every domain. Open a row to read the answers, then accept or reject."
                : `Applications to the ${currentUser?.domain ?? ""} domain. Open a row to read the answers, then accept or reject.`}
            </p>
            {!isAdmin && currentUser?.domain === "R&D" && (
              <p className="mt-2 max-w-2xl text-xs text-amber-200">The application form does not have an R&amp;D option yet, so there is nothing to review here.</p>
            )}
          </div>
          <ApplicantsReview canExport={isAdmin} />
        </div>
      </div>
    </PortalAccessGate>
  );
}
