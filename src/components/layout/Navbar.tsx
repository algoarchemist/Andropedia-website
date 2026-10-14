"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ACCENTS, type Accent } from "@/content/accents";
import { RingDial } from "./RingDial";
import { getPortalDestinationForUser, useAuth } from "@/lib/auth-context";

// A hidden navigation: no bar. The "Andropedia" wordmark goes home and the Recruitment link sits in the
// top-right corner. The menu is a rotary phone dial: a slim handle at the top-centre of the screen opens it
// (hover, tap, or keyboard focus) over a dimmed page. Every page is a ring with its name written inside it: press
// one, pull it round to the finger stop and let go to dial that page, or just tap it. The dial is the lower half
// of a dial hanging from the top edge, a little narrower on a phone (see RingDial). Close with the button, Esc, or
// a tap on the dimmed page.

interface MenuItem {
  name: string;
  href: string;
  accent: Accent;
}

// The rings on the dial follow this order. Recruitment is always last (4), so "Join us" stays the final ring as the menu grows.
const ITEMS: MenuItem[] = [
  { name: "Teams", href: "/team", accent: ACCENTS.teal },
  { name: "Events", href: "/events", accent: ACCENTS.purple },
  { name: "Members", href: "/portal/login", accent: ACCENTS.amber }, // signed-in members go to their portal instead
  { name: "Join us", href: "/join", accent: ACCENTS.red },
];

const PHONE = "(max-width: 639px)";
const subscribePhone = (onChange: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** How long the pointer rests on the handle before the dial opens. */
const OPEN_DELAY_MS = 130;
/** The dial's easing: quick at first, then settling, no overshoot. */
const OPEN_EASE = [0.16, 1, 0.3, 1] as const;

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
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragging = useRef(false);
  const open = hovered || pinned;
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);

  const close = useCallback(() => {
    clearTimeout(leaveTimer.current);
    clearTimeout(openTimer.current);
    setHovered(false);
    setPinned(false);
  }, []);

  // Hover is for mice only. A touch screen fakes mouse events after a tap, which would open the menu
  // and swap the handle out before its click lands.
  // Opening waits a moment (hover intent), so the dial does not fire when the pointer merely passes over the handle on its way
  // elsewhere; once the dial is open, moving between its parts keeps it open at once.
  const enter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || phone) return;
    clearTimeout(leaveTimer.current);
    if (open) return;
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setHovered(true), OPEN_DELAY_MS);
  };
  const leave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(openTimer.current); // the pointer left before the delay was up: do not open
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (!dragging.current) setHovered(false);
    }, 50); // just long enough to cross the small gap between the handle, the dial and the Close button
  };

  // While the menu is open only because the mouse is over it (not pinned by a click or tap), moving the mouse anywhere else closes it.
  // This watches where the mouse actually is, rather than relying on "pointer left" events, which never arrive if the mouse was
  // flicked away before it had registered on the dial that appeared under it.
  useEffect(() => {
    if (!hovered || pinned) return;
    let waiting = false;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if ((e.target as Element | null)?.closest?.("[data-dial-zone]")) {
        clearTimeout(leaveTimer.current);
        waiting = false;
      } else if (!waiting && !dragging.current) {
        waiting = true;
        clearTimeout(leaveTimer.current);
        leaveTimer.current = setTimeout(() => {
          waiting = false;
          if (!dragging.current) setHovered(false);
        }, 50);
      }
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [hovered, pinned]);

  // Escape closes the menu. (A tap on the dimmed page and the Close button do too.)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Members is the member portal: the login page, or straight to the portal for someone who is already signed in.
  const items = ITEMS.map((i) => (i.name === "Members" && currentUser ? { ...i, href: getPortalDestinationForUser(currentUser) } : i));

  // Home always lands on the hero: from another page it opens "/", and on the home page itself it jumps back to the top.
  const isHome = (href: string) => href === "/";
  // On the home page the climb back is animated, not a jump, so the domains wheel turns back through its steps (with its sound) on the way up.
  const climb = useRef<{ stop: () => void } | null>(null);
  const jumpToHero = () => {
    climb.current?.stop();
    const from = window.scrollY;
    if (from < 4) return;
    if (reduce) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const stop = () => {
      climb.current?.stop();
      climb.current = null;
      ["wheel", "touchstart", "keydown"].forEach((n) => window.removeEventListener(n, stop));
    };
    const seconds = Math.min(2.2, 0.6 + (from / window.innerHeight) * 0.18);
    climb.current = animate(from, 0, {
      duration: seconds,
      ease: [0.45, 0, 0.25, 1],
      onUpdate: (v) => window.scrollTo({ top: v, behavior: "instant" }),
      onComplete: stop,
    });
    ["wheel", "touchstart", "keydown"].forEach((n) => window.addEventListener(n, stop, { passive: true }));
  };
  const goTo = (href: string) => {
    close();
    if (isHome(href) && pathname === "/") jumpToHero();
    else router.push(href);
  };

  // Count the pages opened inside the site, so Back only uses browser history when there is a page of ours to return to.
  const pagesOpened = useRef(0);
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    pagesOpened.current += 1;
  }, [pathname]);
  const goBack = () => {
    close();
    if (pagesOpened.current > 0) {
      pagesOpened.current -= 1;
      router.back();
    } else {
      router.push("/"); // landed here directly (a shared link, a refresh): nothing of ours to go back to
    }
  };

  const handleLogout = async () => {
    await logout(); // ends the server session, then clears local state
    close();
    router.push("/");
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="relative z-10 flex items-start justify-between px-4 pt-3 sm:px-6 sm:pt-4">
        {/* ---------- left: logo only, touching/clicking returns to home page. On a phone it hides while the dial is open (it would sit on top of the dial); it keeps its space so the Back button does not move. ---------- */}
        <div className="flex items-center gap-2">
          <div ref={cardRef} className={`pointer-events-auto relative flex items-center ${open && phone ? "invisible" : ""}`}>
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
                data-intro-target
                className="h-10 w-auto object-contain drop-shadow-[0_0_16px_rgba(0,102,255,0.75)] transition-all duration-300 group-hover:drop-shadow-[0_0_24px_rgba(0,212,255,0.95)]"
              />
            </Link>
          </div>

          {/* Back: returns to the page you were just on, with its scroll position, instead of restarting from the hero. */}
          {pathname !== "/" && (
            <button
              type="button"
              onClick={goBack}
              data-cursor-text="Back"
              aria-label="Go back to the previous page"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-white/80 shadow-[inset_0_0_20px_rgba(204,215,255,0.08)] backdrop-blur-[12px] transition-all hover:border-white/40 hover:bg-white/[0.12] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="w-10" />
      </div>

      {/* ---------- centre: a slim handle that peeks out when the dial is closed ---------- */}
      <div ref={dialRef} data-dial-zone className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2" onPointerEnter={enter} onPointerLeave={leave}>
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
      </div>

      {/* ---------- the dial, over a dimmed page ---------- */}
      <AnimatePresence>
        {open && (
          <motion.nav
            key="dial-menu"
            id="site-menu"
            aria-label="Main"
            className="pointer-events-none fixed inset-0"
            // The nav itself stays until its parts have finished fading, so the dial and the dimmed page leave smoothly too.
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1, transition: { duration: reduce ? 0 : 0.2 } }}
          >
            {/* the dimmed page fades in and out (opacity only) */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-auto absolute inset-0 touch-none bg-black/80"
              onPointerDown={close}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: reduce ? 0 : 0.28, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.18, ease: "easeIn" } }}
            />
            {/* the dial unfolds out of the handle: it grows from the top centre while it fades in (transform and opacity only, so it
                stays smooth even on a busy page) and folds back a little faster on the way out */}
            <motion.div
              className="absolute inset-0"
              style={{ transformOrigin: "50% 0%", willChange: "transform, opacity" }}
              initial={reduce ? false : { opacity: 0, scale: 0.9, y: -14 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: reduce ? 0 : 0.42, ease: OPEN_EASE } }}
              exit={{ opacity: 0, scale: 0.94, y: -8, transition: { duration: reduce ? 0 : 0.2, ease: "easeIn" } }}
            >
              <RingDial
                items={items}
                variant={phone ? "phone" : "desktop"}
                onDragChange={(d) => {
                  dragging.current = d;
                }}
                onSelect={(item) => goTo(item.href)}
                onPointerEnter={enter}
                onPointerLeave={leave}
              />
            </motion.div>
            <motion.button
              type="button"
              onClick={close}
              aria-label="Close the dial menu"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.12 } }}
              exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
              data-dial-zone
              onPointerEnter={enter}
              onPointerLeave={leave}
              className="pointer-events-auto absolute left-1/2 top-3 h-[30px] w-[100px] -translate-x-1/2 rounded-full border border-white/30 bg-white/[0.08] font-mono text-[11px] text-white shadow-[inset_0_0_20px_rgba(204,215,255,0.08)] backdrop-blur-[12px] transition-colors hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              Close ×
            </motion.button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
