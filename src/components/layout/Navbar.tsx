"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ACCENTS, type Accent } from "@/content/accents";
import { RotaryDial } from "./RotaryDial";
import { getPortalDestinationForUser, useAuth } from "@/lib/auth-context";

// A hidden navigation: no bar. The "Andropedia" wordmark goes home and the Recruitment link sits in the
// top-right corner. The menu is the lower half of a rotary phone dial hanging from the top-centre of the
// screen: a slim handle shows there, and hovering it (or the logo card, or tapping, or keyboard focus) drops
// the dial down. Every page is a numbered hole: press and hold one, pull it round to the finger stop and let
// go to dial that page. Plain links under the dial do the same for keyboards.

interface MenuItem {
  name: string;
  href: string;
  accent: Accent;
}

const ITEMS: MenuItem[] = [
  { name: "Join us", href: "/join#how-selection-works", accent: ACCENTS.indigo },
  { name: "Events", href: "/events", accent: ACCENTS.purple },
  { name: "Teams", href: "/team", accent: ACCENTS.teal },
  { name: "Members", href: "/portal/login", accent: ACCENTS.amber }, // signed-in members go to their portal instead
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { currentUser, logout } = useAuth();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragging = useRef(false);
  const open = hovered || pinned;

  const close = useCallback(() => {
    clearTimeout(leaveTimer.current);
    setHovered(false);
    setPinned(false);
  }, []);

  // Hover is for mice only. A touch screen fakes mouse events after a tap, which would open the menu
  // and swap the handle out before its click lands.
  const enter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (!dragging.current) setHovered(false);
    }, 200);
  };

  // Escape and a click or tap anywhere else close the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      const inside = (el: HTMLElement | null) => el?.contains(e.target as Node);
      if (!inside(cardRef.current) && !inside(dialRef.current)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  // Members is the member portal: the login page, or straight to the portal for someone who is already signed in.
  const items = ITEMS.map((i) => (i.name === "Members" && currentUser ? { ...i, href: getPortalDestinationForUser(currentUser) } : i));

  // Home always lands on the hero: from another page it opens "/", and on the home page itself it jumps back to the top.
  const isHome = (href: string) => href === "/";
  const jumpToHero = () => window.scrollTo({ top: 0, behavior: "instant" });
  const goTo = (href: string) => {
    close();
    if (isHome(href) && pathname === "/") jumpToHero();
    else router.push(href);
  };

  const handleLogout = async () => {
    await logout(); // ends the server session, then clears local state
    close();
    router.push("/");
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="flex items-start justify-between px-4 pt-3 sm:px-6 sm:pt-4">
        {/* ---------- left: logo only, touching/clicking returns to home page ---------- */}
        <div ref={cardRef} className="pointer-events-auto relative flex items-center" onPointerEnter={enter} onPointerLeave={leave}>
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                jumpToHero();
              }
              close();
            }}
            data-cursor-text="Home"
            aria-label="Andropedia home"
            className="group flex items-center justify-center p-1 transition-transform duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Andropedia"
              className="h-10 w-auto object-contain drop-shadow-[0_0_16px_rgba(0,102,255,0.75)] transition-all duration-300 group-hover:drop-shadow-[0_0_24px_rgba(0,212,255,0.95)]"
            />
          </Link>
        </div>

        <div className="w-10" />
      </div>

      {/* ---------- centre: the half dial, with a slim handle that peeks out when it is closed ---------- */}
      <div ref={dialRef} className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2" onPointerEnter={enter} onPointerLeave={leave}>
        {!open && (
          <button
            type="button"
            onClick={() => setPinned(true)}
            onFocus={() => setHovered(true)}
            aria-label="Open the dial menu"
            aria-haspopup="true"
            aria-controls="site-menu"
            data-cursor-text="Dial"
            className="group mx-auto flex h-7 w-36 items-start justify-center rounded-b-full border border-t-0 border-white/20 bg-white/[0.06] pt-1.5 shadow-[inset_0_0_20px_rgba(204,215,255,0.08)] backdrop-blur-[12px] transition-all hover:h-9 hover:border-white/40 hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            {/* six tiny holes: a hint of what is inside */}
            <span aria-hidden="true" className="flex items-center gap-1.5">
              {items.map((item) => (
                <span key={item.name} className="h-1.5 w-1.5 rounded-full opacity-80 transition-opacity group-hover:opacity-100" style={{ background: item.accent.a1 }} />
              ))}
            </span>
          </button>
        )}

        <AnimatePresence>
          {open && (
            <motion.nav
              id="site-menu"
              aria-label="Main"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -60, scale: 0.9 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.8 }}
              style={{ transformOrigin: "top center" }}
            >
              <RotaryDial
                items={items}
                onDragChange={(d) => {
                  dragging.current = d;
                }}
                onSelect={(item) => goTo(item.href)}
              />
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
