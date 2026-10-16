"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Send,
  Trophy,
  CheckSquare,
  ClipboardList,
  ShieldAlert,
  Sparkles,
  LogOut,
  KeyRound,
  UserRound,
  ClipboardCheck,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/portal/login");
  };

  const isLead = currentUser?.role === "domain_admin" || currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "super_admin";

  const links = [
    { name: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
    { name: "Submit Task", href: "/portal/submit-task", icon: Send },
    { name: "Leaderboard", href: "/portal/leaderboard", icon: Trophy, highlight: true },
    ...(isLead
      ? [
          { name: "Post Tasks", href: "/portal/tasks", icon: ClipboardList },
          { name: "Evaluations", href: "/portal/evaluations", icon: CheckSquare },
          { name: "Applications", href: "/portal/applications", icon: ClipboardCheck },
          { name: "Announce", href: "/portal/announcements", icon: Megaphone },
        ]
      : []),
    ...(isAdmin ? [{ name: "Admin Panel", href: "/portal/admin", icon: ShieldAlert }] : []),
    { name: "Profile", href: "/portal/profile", icon: UserRound },
    { name: "Password", href: "/portal/account", icon: KeyRound, compact: true },
  ];

  return (
    <div className="sticky top-[60px] z-40 w-full border-b border-sky-400/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1920px] px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto"
          >
            <div className="flex items-center gap-3">
              <img loading="lazy" decoding="async"
                src={currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt={currentUser?.name || "Member"}
                className="h-10 w-10 rounded-2xl border border-cyan-400/30 object-cover object-top shadow-[0_0_20px_rgba(103,232,249,0.2)]"
              />
              <div>
                <div className="text-sm font-bold text-white">{currentUser?.name}</div>
                <div className="text-[11px] font-mono capitalize text-slate-400">
                  {currentUser?.role === "super_admin"
                    ? "Super Admin"
                    : currentUser?.role === "domain_admin"
                      ? `Lead (${currentUser?.domain})`
                      : "Active Member"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono leading-none text-emerald-300">
                {currentUser?.domain}
              </span>
              <span className="hidden items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/5 px-2 py-1 text-[10px] font-mono uppercase leading-none tracking-[0.2em] text-sky-300 2xl:inline-flex">
                <Sparkles className="h-3 w-3" />
                Portal
              </span>
            </div>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:flex-1 sm:justify-end"
          >
            {/* The links scroll sideways if the screen is too narrow for all of them; Sign out stays put beside them. */}
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    aria-label={link.name}
                    title={link.name}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.2)]"
                        : link.highlight
                          ? "text-amber-300 hover:bg-slate-800/70"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className={link.compact ? "hidden 2xl:inline" : undefined}>{link.name}</span>
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="mb-1 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Sign out</span>
            </button>
          </motion.nav>
        </div>
      </div>
    </div>
  );
}
