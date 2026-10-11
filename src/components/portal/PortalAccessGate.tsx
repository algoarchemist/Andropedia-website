"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LockKeyhole, LogIn } from "lucide-react";
import { RoleType } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

interface PortalAccessGateProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

export function PortalAccessGate({ children, allowedRoles }: PortalAccessGateProps) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Still on the default password: the only page that works is the one that changes it.
  const mustChange = !!currentUser?.mustChangePassword && pathname !== "/portal/account";
  useEffect(() => {
    if (mustChange) router.replace("/portal/account");
  }, [mustChange, router]);

  if (isLoading || mustChange) {
    return (
      <div className="min-h-screen bg-transparent" aria-busy="true">
        <h1 className="sr-only">Andropedia member portal</h1>
      </div>
    );
  }

  const hasAccess = currentUser !== null && (!allowedRoles || allowedRoles.includes(currentUser.role));

  if (!hasAccess) {
    const message = currentUser
      ? "Your club role does not have access to this workspace."
      : "This workspace is reserved for verified Andropedia club members.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-16 text-slate-100">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-[28px] border border-sky-500/20 bg-black/60 p-8 text-center shadow-[0_30px_120px_rgba(3,7,18,0.85)] backdrop-blur-xl"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10">
            <LockKeyhole className="h-7 w-7 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Club access required</h1>
            <p className="text-sm text-slate-400">{message}</p>
          </div>

          {!currentUser && (
            <Link
              href="/portal/login"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_16px_30px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.01]"
            >
              <LogIn className="h-4 w-4" />
              Member login
            </Link>
          )}

          <Link href="/" className="mt-5 block text-xs text-slate-400 transition-colors hover:text-emerald-300">
            Return to public site
          </Link>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
