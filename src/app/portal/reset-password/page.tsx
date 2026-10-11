"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base sm:text-sm text-white placeholder:text-white/40 shadow-[inset_0_0_30px_rgba(204,215,255,0.06)] focus:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 transition-colors";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (password !== confirm) return setErrorMsg("The two passwords don't match.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) setDone(true);
      else setErrorMsg(data.error || "Something went wrong. Please try again.");
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div role="status" className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" aria-hidden="true" />
        <p className="text-[14px] leading-6 text-white/80">Your password was changed. Sign in with your new password.</p>
        <Link href="/portal/login" className="btn-glow inline-flex">
          Go to sign in
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <p className="text-center text-[14px] text-white/70">
        This reset link is incomplete.{" "}
        <Link href="/portal/forgot-password" className="text-emerald-300 hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      {errorMsg && (
        <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[13px] text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="reset-new" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">
            New password
          </label>
          <PasswordInput id="reset-new" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" minLength={8} maxLength={60} required />
          <p className="text-[12px] leading-4 text-white/40">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reset-confirm" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">
            Confirm new password
          </label>
          <PasswordInput id="reset-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" minLength={8} maxLength={60} required />
        </div>
        <button type="submit" disabled={loading} className="btn-glow w-full disabled:opacity-60">
          {loading ? "Saving..." : "Set new password"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-12 text-white sm:px-6">
      <div className="glass-card w-full max-w-md p-6 sm:p-9">
        <div className="mb-7 space-y-1.5 text-center">
          <h1 className="text-aurora text-[28px] font-semibold leading-9 tracking-[-1px]">Choose a new password</h1>
        </div>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
