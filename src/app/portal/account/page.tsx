"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { PortalNav } from "@/components/portal/PortalNav";
import { PortalAccessGate } from "@/components/portal/PortalAccessGate";
import { getPortalDestinationForUser, useAuth } from "@/lib/auth-context";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base sm:text-sm text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 transition-colors";
const labelClass = "text-[12px] font-medium uppercase tracking-[0.08em] text-white/60";

export default function AccountPage() {
  const { currentUser, refreshUser } = useAuth();
  const router = useRouter();
  const forced = !!currentUser?.mustChangePassword;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setDone(false);
    if (next !== confirm) return setErrorMsg("The two new passwords don't match.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
        const wasForced = forced;
        await refreshUser();
        if (wasForced) router.replace(getPortalDestinationForUser({ ...currentUser!, mustChangePassword: false }));
      } else {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <PortalAccessGate>
      <div className="flex min-h-screen flex-col bg-transparent text-slate-100">
        <PortalNav />
        <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
          <div className="glass-card p-6 sm:p-8">
            <h1 className="text-aurora mb-1 text-[24px] font-semibold tracking-[-0.5px]">Change password</h1>
            {forced && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-[13px] leading-5 text-amber-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>You are still using the default password. Choose a new one to continue to the portal.</span>
              </div>
            )}
            <p className="mb-6 text-[13px] leading-5 text-white/50">
              Until you change it, your password is your register number. Other devices are signed out when you save.
            </p>

            {errorMsg && (
              <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[13px] text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}
            {done && (
              <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Password changed.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="pw-current" className={labelClass}>Current password</label>
                <input id="pw-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} autoComplete="current-password" maxLength={60} required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pw-new" className={labelClass}>New password</label>
                <input id="pw-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} autoComplete="new-password" minLength={8} maxLength={60} required />
                <p className="text-[12px] leading-4 text-white/40">At least 8 characters.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pw-confirm" className={labelClass}>Confirm new password</label>
                <input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" minLength={8} maxLength={60} required />
              </div>
              <button type="submit" disabled={loading} className="btn-glow w-full disabled:opacity-60">
                {loading ? "Saving..." : "Change password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PortalAccessGate>
  );
}
