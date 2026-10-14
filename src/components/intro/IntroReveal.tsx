"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  A_HOLE, A_OUTER, ARROWHEAD, BG0, BG_DUR, CARET, CLOUD_D, COL0, COL1, DOCK, DOM0, DOM1, EX0, EX1, FINAL_VB, FLY0, FLY_DUR, HERO0, HOLE_START, MOR1, NODES, PC,
  polyPath, STUB_LOW_D, STUB_MID_D, TC, TRIANGLE, TY0, URL_STR, END, DEL_END, ENTER, clamp, ease, lerp, markPath, mixPts, nChars,
} from "@/lib/intro-timeline";
import * as isnd from "@/lib/intro-sound";

/**
 * The intro, shown once per session when the site is opened on the home page. It follows andropedia-preloader.html, redrawn with
 * the real Andropedia logo and playing by itself (no click):
 *
 *   a caret widens into a fake address bar, which types a long messy link, deletes the extra parts and presses Enter;
 *   the bar collapses back to a caret, the caret becomes a play triangle, and after a short beat the triangle unfolds into the
 *   logo's "A"; the cloud, circuit lines and nodes draw in, the wordmark sweeps through, and the logo flies into the navbar's
 *   logo slot while the page behind it comes in.
 *
 * The address bar is for style only: it never touches the real URL. The whole thing is one function of elapsed time. Skip (or
 * Escape) jumps to the end, and visitors who prefer reduced motion do not get the intro at all.
 */
const SEEN_KEY = "andropedia:intro-seen";
const LOGO_BLUE = "#4175ee"; // the blue of the logo artwork, the only colour here besides the neutrals
const VB_W = FINAL_VB[2];
const VB_H = FINAL_VB[3];

const dashed = { strokeDasharray: "1 1", strokeDashoffset: 1, opacity: 0 } as const;

export function IntroReveal() {
  const pathname = usePathname();
  // Only a page load that lands on the home page gets the intro; later client-side visits to "/" do not.
  const [enabled] = useState(() => pathname === "/");
  const [gone, setGone] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const txt = useRef<HTMLDivElement>(null);
  const t1 = useRef<HTMLSpanElement>(null);
  const t2 = useRef<HTMLSpanElement>(null);
  const t3 = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const cloud = useRef<SVGPathElement>(null);
  const stubMid = useRef<SVGPathElement>(null);
  const stubLow = useRef<SVGPathElement>(null);
  const nodes = useRef<(SVGCircleElement | null)[]>([]);
  const halos = useRef<SVGGElement>(null);
  const mark = useRef<SVGPathElement>(null);
  const arrow = useRef<SVGPathElement>(null);
  const shine = useRef<SVGGElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const skipBtn = useRef<HTMLButtonElement>(null);
  const api = useRef({ skip: () => {} });

  useEffect(() => {
    if (!enabled) return;
    const html = document.documentElement;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* private mode: just play it */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let finished = false;
    const markSeen = () => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      markSeen();
      delete html.dataset.intro;
      html.dataset.introHero = "in";
      html.style.overflow = "";
      setGone(true);
    };

    // Already seen this session (the head script has hidden the overlay), or the visitor wants no motion: no intro.
    if (seen || reduced) {
      finished = true;
      if (reduced) markSeen();
      delete html.dataset.intro;
      raf = requestAnimationFrame(() => setGone(true));
      return;
    }

    const rootEl = root.current;
    const bgEl = bg.current;
    const pillEl = pill.current;
    const txtEl = txt.current;
    const t1El = t1.current;
    const t2El = t2.current;
    const t3El = t3.current;
    const caretEl = caret.current;
    const wrapEl = wrap.current;
    const svgEl = svg.current;
    const cloudEl = cloud.current;
    const midEl = stubMid.current;
    const lowEl = stubLow.current;
    const haloEl = halos.current;
    const markEl = mark.current;
    const arrowEl = arrow.current;
    const shineEl = shine.current;
    const wordEl = word.current;
    if (!rootEl || !bgEl || !pillEl || !txtEl || !t1El || !t2El || !t3El || !caretEl || !wrapEl || !svgEl || !cloudEl || !midEl || !lowEl || !haloEl || !markEl || !arrowEl || !shineEl || !wordEl) return;

    html.dataset.intro = "on"; // hides the navbar logo until the flying logo lands on it
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    isnd.preloadKeySamples();

    // ---- measurements (redone on resize) ------------------------------------------------------------------------------
    let W = 560; // the logo's width on screen
    let charW = 8;
    const size = () => {
      W = Math.min(window.innerWidth * 0.86, 560);
      wrapEl.style.setProperty("--W", `${W}px`);
      const fs = clamp(window.innerWidth * 0.019, 12, 15);
      txtEl.style.fontSize = `${fs}px`;
      const probe = document.createElement("canvas").getContext("2d");
      if (probe) {
        probe.font = `500 ${fs}px ${getComputedStyle(txtEl).fontFamily}`;
        charW = probe.measureText("M").width || charW;
      }
    };
    size();
    window.addEventListener("resize", size);

    // ---- one frame, a pure function of the time T (ms) -----------------------------------------------------------------
    // Only write a style or attribute when its value actually changed: most elements sit still for most of the intro.
    const last: Record<string, string> = {};
    const put = (key: string, value: string, write: () => void) => {
      if (last[key] === value) return;
      last[key] = value;
      write();
    };
    let lastN = -1;
    let lastSoundN = 0;
    const fired = { enter: false, bloom: false, pop: false, reveal: false, fly: false, dock: false, hero: false };
    let target: { cx: number; cy: number; h: number } | null = null;

    const render = (T: number) => {
      const u = T - TC; // time since the triangle began to become the logo (negative before that)
      const k = W / VB_W; // screen px per logo unit
      const barW = 2.4 * k;
      const barH = 80 * k;
      const pw0 = Math.min(window.innerWidth * 0.86, 560);

      // 1. The address bar: caret -> bar -> typing -> deleting -> Enter -> collapse to a caret
      let pw = 2;
      let ph = 28;
      let pr = 1;
      let pct = 100;
      let op = 1;
      let txtOp = 1;
      let showPill = true;
      if (T < EX0) {
        op = Math.floor(T / 520) % 2 === 0 ? 1 : 0;
        txtOp = 0;
      } else if (T < EX1) {
        const e = ease.out((T - EX0) / (EX1 - EX0));
        pw = lerp(2, pw0, e);
        ph = lerp(28, 46, e);
        pr = lerp(1, 23, e);
        pct = (1 - e) * 100;
        txtOp = 0;
      } else if (T < COL0) {
        pw = pw0;
        ph = 46;
        pr = 23;
        pct = 0;
      } else if (T < COL1) {
        const p = (T - COL0) / (COL1 - COL0);
        const e2 = ease.out(p);
        pw = lerp(pw0, barW, e2);
        ph = lerp(46, barH, e2);
        pr = lerp(23, 0, e2);
        pct = e2 * 100;
        txtOp = 1 - clamp(p / 0.35);
      } else {
        showPill = false;
      }
      const enterOn = T >= ENTER;
      const ps = pillEl.style;
      put("pill", `${showPill}|${op}|${pw.toFixed(1)}|${ph.toFixed(1)}|${pr.toFixed(1)}|${pct.toFixed(1)}|${enterOn}`, () => {
        ps.display = showPill ? "block" : "none";
        ps.opacity = String(op);
        ps.width = `${pw}px`;
        ps.height = `${ph}px`;
        ps.borderRadius = `${pr}px`;
        ps.background = `color-mix(in srgb, ${LOGO_BLUE} ${pct.toFixed(1)}%, #0d1322)`;
        ps.boxShadow = `inset 0 0 0 ${enterOn ? 1.5 : 1}px color-mix(in srgb, ${LOGO_BLUE} ${(enterOn ? 100 : pct).toFixed(1)}%, rgba(255,255,255,0.16))`;
      });
      put("txtOp", txtOp.toFixed(3), () => (txtEl.style.opacity = String(txtOp)));
      const n = nChars(T);
      if (n !== lastN) {
        lastN = n;
        t1El.textContent = URL_STR.slice(0, Math.min(n, DOM0));
        t2El.textContent = n > DOM0 ? URL_STR.slice(DOM0, Math.min(n, DOM1)) : "";
        t3El.textContent = n > DOM1 ? URL_STR.slice(DOM1, n) : "";
        // sound: a keystroke for each character typed, a backspace for each one removed
        if (n > lastSoundN) isnd.type(URL_STR[n - 1] ?? "a");
        else if (n < lastSoundN) isnd.back();
        lastSoundN = n;
      }
      const typing = T >= TY0 && T < DEL_END;
      const caretOn = typing || Math.floor(T / 520) % 2 === 0 ? "1" : "0";
      put("caret", caretOn, () => (caretEl.style.opacity = caretOn));
      // the text scrolls left like a real input when it is wider than the bar (measured from the character count: no layout reads)
      const shift = Math.min(0, pw0 - 40 - (n * charW + 3));
      put("shift", shift.toFixed(1), () => (txtEl.style.transform = `translateX(${shift}px)`));
      if (T >= ENTER && !fired.enter) {
        fired.enter = true;
        isnd.enter();
      }
      if (T >= COL0 && !fired.bloom) {
        fired.bloom = true;
        isnd.bloom();
      }
      if (T >= MOR1 && !fired.pop) {
        fired.pop = true;
        isnd.pop();
      }
      if (u >= 0 && !fired.reveal) {
        fired.reveal = true;
        isnd.reveal();
      }

      // 2. The mark: caret -> play triangle -> the logo's A (with its hole), then the small arrowhead
      const m1 = ease.io(clamp((T - COL1) / (MOR1 - COL1)));
      const m2 = ease.io(clamp(u / 700));
      const dMark = markPath(mixPts(mixPts(CARET, TRIANGLE, m1), A_OUTER, m2), mixPts(HOLE_START, A_HOLE, m2));
      put("mark", dMark, () => markEl.setAttribute("d", dMark));
      put("markOp", T >= COL1 ? "1" : "0", () => markEl.setAttribute("opacity", T >= COL1 ? "1" : "0"));
      const aq = ease.out(clamp((u - 700) / 380));
      put("arrow", aq.toFixed(3), () => {
        arrowEl.setAttribute("opacity", String(aq));
        arrowEl.style.transform = `scale(${lerp(0.4, 1, aq).toFixed(3)})`;
      });

      // 3. The camera pans from the triangle out to the whole logo (a transform, so the drawing itself is not repainted for it);
      //    the cloud, circuit lines and nodes draw in
      const vp = ease.io(clamp(u / 900));
      const panY = -(PC[1] - (FINAL_VB[1] + VB_H / 2)) * k * (1 - vp);
      const panX = -(PC[0] - (FINAL_VB[0] + VB_W / 2)) * k * (1 - vp);
      put("pan", `${panX.toFixed(2)}|${panY.toFixed(2)}`, () => (svgEl.style.transform = `translate3d(${panX.toFixed(2)}px,${panY.toFixed(2)}px,0)`));
      const pc = ease.io(clamp((u - 250) / 800));
      put("cloud", pc.toFixed(3), () => {
        cloudEl.style.strokeDashoffset = String(1 - pc);
        cloudEl.style.opacity = pc > 0 ? "1" : "0";
      });
      [midEl, lowEl].forEach((ln, j) => {
        const q = ease.io(clamp((u - 600 - j * 70) / 420));
        put(`ln${j}`, q.toFixed(3), () => {
          ln.style.strokeDashoffset = String(1 - q);
          ln.style.opacity = q > 0 ? "1" : "0";
        });
      });
      nodes.current.forEach((nd, j) => {
        if (!nd) return;
        const r = Math.max(0, NODES[j].r * ease.back(clamp((u - 950 - j * 70) / 320))).toFixed(2);
        put(`nd${j}`, r, () => nd.setAttribute("r", r));
      });
      const hq = ease.out(clamp((u - 1100) / 400));
      put("halo", hq.toFixed(3), () => haloEl.setAttribute("opacity", String(hq)));
      const sq = ease.out(clamp((u - 1150) / 400));
      put("shine", sq.toFixed(3), () => shineEl.setAttribute("opacity", String(sq)));

      // 4. The wordmark reveals, then sweeps away just before the logo leaves
      const rv = ease.out(clamp((u - 1000) / 500));
      const lv = ease.io(clamp((u - 1650) / 260)) * 100;
      const clip = `inset(-10% ${(100 * (1 - rv)).toFixed(2)}% -10% ${lv.toFixed(2)}%)`;
      put("word", clip, () => (wordEl.style.clipPath = clip));

      // 5. The logo flies into the navbar's logo slot
      const fp = clamp((u - FLY0) / FLY_DUR);
      const fe = ease.smooth(fp);
      if (fp > 0) {
        if (!fired.fly) {
          fired.fly = true;
          isnd.fly();
          const el = document.querySelector<HTMLElement>("[data-intro-target]");
          const r = el?.getBoundingClientRect();
          target = r && r.width > 0 ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height } : { cx: 44, cy: 36, h: 40 };
        }
        const tgt = target!;
        // the logo's drawing is scaled so its height matches the artwork inside the navbar image
        const s = (tgt.h * 0.92) / ((W * VB_H) / VB_W);
        const dx = tgt.cx - window.innerWidth / 2;
        const dy = tgt.cy - window.innerHeight / 2;
        wrapEl.style.transform = `translate3d(${(dx * fe).toFixed(2)}px,${(dy * fe).toFixed(2)}px,0) scale(${lerp(1, s, fe).toFixed(4)})`;
      }
      const bgo = String(1 - ease.io(clamp((u - BG0) / BG_DUR)));
      put("bg", bgo, () => (bgEl.style.opacity = bgo));

      // 6. Landing: the real navbar logo fades in as the drawn one fades out, and the page behind comes in
      if (u >= DOCK) {
        if (!fired.dock) {
          fired.dock = true;
          isnd.dock();
          delete html.dataset.intro;
          html.style.overflow = "";
        }
        const wo = String(1 - clamp((u - DOCK) / 250));
        put("wrapOp", wo, () => (wrapEl.style.opacity = wo));
      }
      if (u >= HERO0 && !fired.hero) {
        fired.hero = true;
        html.dataset.introHero = "in";
      }
      // once the black is gone the overlay no longer takes clicks, and Skip goes
      const passive = u >= FLY0;
      put("passive", String(passive), () => {
        rootEl.style.pointerEvents = passive ? "none" : "auto";
        if (skipBtn.current) skipBtn.current.style.opacity = passive ? "0" : "1";
      });
    };

    // ---- the clock -----------------------------------------------------------------------------------------------------
    // A development aid: sessionStorage "andropedia:intro-speed" = 0.2 plays the intro at a fifth of the speed.
    let speed = 1;
    try {
      speed = Number(sessionStorage.getItem("andropedia:intro-speed")) || 1;
    } catch {
      /* ignore */
    }
    const t0 = performance.now();
    const tick = () => {
      const T = (performance.now() - t0) * speed;
      render(T);
      if (T >= TC + END) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    api.current = { skip: finish };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", size);
      html.style.overflow = "";
      delete html.dataset.intro;
      delete html.dataset.introHero;
    };
  }, [enabled]);

  if (!enabled || gone) return null;

  return (
    <div id="intro-root" ref={root} className="fixed inset-0 z-[2000] overflow-hidden" role="status">
      <span className="sr-only">Loading Andropedia</span>
      <div ref={bg} className="absolute inset-0" style={{ backgroundColor: "#05060a" }} />

      {/* The address bar: for style only, hidden from assistive tech so the typed text is not read out */}
      <div
        ref={pill}
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 box-border overflow-hidden"
        style={{ transform: "translate(-50%,-50%)", opacity: 0, width: 2, height: 28 }}
      >
        <div className="absolute inset-0 flex items-center overflow-hidden" style={{ paddingInline: 20 }}>
          <div ref={txt} className="flex items-center whitespace-pre font-mono font-medium leading-none text-white" style={{ fontSize: 14 }}>
            <span ref={t1} className="text-white/45" />
            <span ref={t2} />
            <span ref={t3} className="text-white/45" />
            <i ref={caret} className="ml-px block not-italic" style={{ width: 2, height: "1.35em", backgroundColor: LOGO_BLUE }} />
          </div>
        </div>
      </div>

      {/* The logo, drawn in the logo's own shapes */}
      <div
        ref={wrap}
        aria-hidden="true"
        className="absolute left-1/2 top-1/2"
        style={{
          ["--W" as string]: "560px",
          width: "var(--W)",
          height: `calc(var(--W) * ${VB_H / VB_W})`,
          marginLeft: "calc(var(--W) / -2)",
          marginTop: `calc(var(--W) * ${-VB_H / VB_W / 2})`,
          color: LOGO_BLUE,
          willChange: "transform, opacity",
        }}
      >
        <svg ref={svg} viewBox={FINAL_VB.join(" ")} className="block h-full w-full overflow-visible" fill="none" style={{ willChange: "transform" }}>
          <path ref={cloud} pathLength={1} d={CLOUD_D} stroke="currentColor" strokeWidth={42} strokeLinejoin="round" style={dashed} />
          <path ref={stubMid} pathLength={1} d={STUB_MID_D} stroke="currentColor" strokeWidth={32} style={dashed} />
          <path ref={stubLow} pathLength={1} d={STUB_LOW_D} stroke="currentColor" strokeWidth={32} strokeLinejoin="miter" style={dashed} />
          {NODES.map((n, i) => (
            <circle key={i} ref={(el) => { nodes.current[i] = el; }} cx={n.cx} cy={n.cy} r={0} stroke="currentColor" strokeWidth={n.sw} />
          ))}
          <g ref={halos} opacity={0} stroke="currentColor" strokeOpacity={0.45} strokeWidth={3}>
            {NODES.filter((n) => n.halo).map((n) => (
              <circle key={n.cx} cx={n.cx} cy={n.cy} r={n.halo} />
            ))}
          </g>
          <path ref={mark} d="" fill="currentColor" fillRule="evenodd" opacity={0} />
          <path ref={arrow} d={polyPath(ARROWHEAD)} fill="currentColor" opacity={0} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          <g ref={shine} opacity={0} stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeOpacity={0.9}>
            <path d="M744 324 H757" />
            <path d="M747 416 H759" />
            <path d="M230 492 L255 534" />
          </g>
        </svg>
        <div
          ref={word}
          className="absolute inset-x-0 text-center font-mono font-bold uppercase leading-[1.1] tracking-[0.08em] text-white"
          style={{ top: "100%", fontSize: "clamp(26px, 6vw, 46px)", clipPath: "inset(-10% 100% -10% 0)" }}
        >
          Andropedia
        </div>
      </div>

      <button
        ref={skipBtn}
        type="button"
        onClick={() => api.current.skip()}
        className="absolute right-4 top-4 rounded-lg px-3 py-2.5 font-mono text-[13px] text-white/55 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 sm:right-6 sm:top-6"
      >
        Skip intro
      </button>
    </div>
  );
}
