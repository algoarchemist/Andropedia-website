"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, BarChart3, Lock, ShieldCheck } from "lucide-react";
import { getPortalDestinationForUser, useAuth } from "@/lib/auth-context";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-base sm:text-sm text-white placeholder:text-white/40 shadow-[inset_0_0_30px_rgba(204,215,255,0.06)] focus:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [registerNo, setRegisterNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const result = await login(registerNo, password);
    if ("user" in result) {
      router.push(getPortalDestinationForUser(result.user));
    } else {
      setErrorMsg(result.error);
      setLoading(false);
    }
  };

  const perks = [
    { icon: ShieldCheck, text: "Verified member access" },
    { icon: BarChart3, text: "Live leaderboard insights" },
    { icon: Lock, text: "Secure sprint workspace" },
  ];

  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-12 text-white sm:px-6">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden space-y-8 lg:block">
          <p className="chip">Member portal</p>
          <h1 className="text-[56px] font-medium leading-[1.05] tracking-[-3px]">
            <span className="text-fade">Build smarter.</span> <br /> <span className="text-aurora">Perform louder.</span>
          </h1>
          <p className="max-w-md text-[16px] leading-6 text-white/70">
            Access sprint evaluations, weekly submissions and leaderboards from a secure club workspace designed for ambitious builders.
          </p>
          <ul className="space-y-3">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="glass-inner flex max-w-sm items-center gap-3 px-4 py-3">
                <Icon className="h-5 w-5 text-teal-300" aria-hidden="true" />
                <span className="text-[14px] leading-5 text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card w-full max-w-md justify-self-center p-6 sm:p-9 lg:max-w-none">
          <div className="mb-7 space-y-1.5 text-center">
            <h2 className="text-aurora text-[28px] font-semibold leading-9 tracking-[-1px]">Welcome back</h2>
            <p className="text-[13px] leading-5 text-white/50">Sign in with your register number</p>
          </div>

          {errorMsg && (
            <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[13px] text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="login-regno" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">
                Register number
              </label>
              <input
                id="login-regno"
                type="text"
                value={registerNo}
                onChange={(e) => setRegisterNo(e.target.value)}
                className={`${inputClass} uppercase`}
                placeholder="RA2511026020025"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={30}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/60">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                maxLength={60}
                required
              />
              <p className="text-[12px] leading-4 text-white/40">
                First time? Use your register number, then you will choose a new password.{" "}
                <Link href="/portal/forgot-password" className="text-emerald-300 hover:underline">
                  Forgot password?
                </Link>
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-glow w-full disabled:opacity-60">
              {loading ? "Signing in..." : "Enter member portal"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
