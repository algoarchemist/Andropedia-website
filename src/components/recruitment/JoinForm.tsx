"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarClock, Check, Copy, Lock, Pencil, Pin, Send } from "lucide-react";
import { RECRUIT_DOMAINS, WHATSAPP_COMMUNITY_URL } from "@/content/recruitment";
import { ToastRegion, useToasts } from "@/components/ui/Toast";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { DOMAIN_ACCENT, ACCENTS } from "@/content/accents";
import {
  ALL_QUESTION_IDS,
  DOMAIN_IDS,
  DOMAIN_QUESTIONS,
  OTHER,
  OTHER_PREFIX,
  UNIVERSAL_QUESTIONS,
  validateAnswers,
  type DomainId,
  type Question,
} from "@/lib/recruitment/questions";
import * as sfx from "@/lib/game-sound";
import { GameBoard } from "./game/GameBoard";
import { SoundToggle } from "./game/SoundToggle";
import { HoldToConfirm } from "./HoldToConfirm";
import { AndySays, type Mood } from "./game/Mascot";
import { PowerBar } from "./game/PowerBar";
import { StarterChips } from "./game/StarterChips";
import { XpChip } from "./game/XpChip";
import { fireConfetti } from "./game/confetti";
import { ANDY_CHEER, ANDY_HI, BONUS_XP, DEFAULT_STARTERS, DOMAIN_CLASS, LEVELS, LEVEL_XP, STARTERS } from "./game/config";
import { domainNoteKeys, noteXp, notesForLevel, type NoteDef } from "./pinboard/notes";
import "./pinboard/pinboard.css";

type Answer = string | string[];

interface FormData {
  name: string;
  registerNo: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  profile: string;
  domain: DomainId | "";
  /** Raw answers by question id. For a choice with "Other" picked, the value is "Other" and the text is in `other`. */
  answers: Record<string, Answer>;
  other: Record<string, string>;
  consent: boolean;
  website: string; // honeypot, hidden from real users
}

interface CycleInfo {
  state: "open" | "upcoming" | "closed";
  opensAt: string | null;
  closesAt: string | null;
  message: string;
}

const LAST_STEP = LEVELS.length - 1;
const CLASS_STEP = 2;
const ROUND_STEP = 3;
const BASIC_KEYS = ["name", "registerNo", "department", "year", "phone", "email", "profile"] as const;
const YEARS = ["first", "second", "third", "fourth", "other"];
const YEAR_LABELS: Record<string, string> = {
  first: "1st Year", second: "2nd Year", third: "3rd Year", fourth: "4th Year", other: "Other",
};
/** Resting tilt of each note, in degrees (0.5 to 1.2 either way). Open notes and inputs never tilt. */
const TILTS = [-1.1, 0.9, -0.7, 0.8];
/** The class cards lean a little more, like notes dropped on the board. */
const CLASS_TILTS = [2.2, -2.4, 1.6, -1.8, 2];
const FUN_LINE = "Error 404: boring application not found";
const WHATSAPP_URL = WHATSAPP_COMMUNITY_URL;

const ALL_QUESTIONS: Question[] = [...UNIVERSAL_QUESTIONS, ...DOMAIN_IDS.flatMap((d) => DOMAIN_QUESTIONS[d])];
const QUESTION_BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
const UNIVERSAL_IDS = new Set(UNIVERSAL_QUESTIONS.map((q) => q.id));
const NOTE_LEVELS = [0, 1, ROUND_STEP];

const domainQuestions = (d: DomainId | "") => (d ? DOMAIN_QUESTIONS[d] : []);

/** Fields shown on each step, in order (used to find the step and field of an error). */
function stepKeys(step: number, domain: DomainId | ""): string[] {
  if (step === 0) return [...BASIC_KEYS];
  if (step === 1) return UNIVERSAL_QUESTIONS.map((q) => q.id);
  if (step === CLASS_STEP) return ["domain"];
  if (step === ROUND_STEP) return domainQuestions(domain).map((q) => q.id);
  return ["consent"];
}

/** DOM id to focus for a field that has an error. */
function focusId(key: string): string {
  if (key === "domain") return `domain-${RECRUIT_DOMAINS[0].id}`;
  if (key === "consent") return "consent";
  const q = QUESTION_BY_ID.get(key);
  if (!q) return `f-${key}`;
  if (q.kind === "choice" || q.kind === "multi") return `q-${q.id}-0`;
  if (q.kind === "scale") return `q-${q.id}-${q.from}`;
  return `q-${q.id}`;
}

const EMPTY: FormData = {
  name: "", registerNo: "", department: "", year: "second", phone: "", email: "", profile: "",
  domain: "", answers: {}, other: {}, consent: false, website: "",
};

/** The answers as the server expects them: "Other" choices carry their text. */
function composeAnswers(f: FormData): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  for (const [id, value] of Object.entries(f.answers)) {
    const q = QUESTION_BY_ID.get(id);
    out[id] = q?.kind === "choice" && q.other && value === OTHER ? `${OTHER_PREFIX}${(f.other[id] ?? "").trim()}` : value;
  }
  return out;
}

// ---------------------------------------------------------------- validation (mirrors the server)
type Errors = Record<string, string | undefined>;

function validate(f: FormData, step: number): Errors {
  const e: Errors = {};
  const len = (v: string) => v.trim().length;
  if (step === 0) {
    const digits = f.phone.replace(/\D/g, "").length;
    if (len(f.name) < 2) e.name = "Enter your full name.";
    if (len(f.registerNo) < 3) e.registerNo = "Enter your register / roll number.";
    if (len(f.department) < 2) e.department = "Enter your department.";
    if (!/^\+?[\d\s\-()]{10,20}$/.test(f.phone.trim()) || digits < 10 || digits > 15) e.phone = "Enter a valid phone / WhatsApp number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
    if (len(f.profile) < 3) e.profile = "Share a LinkedIn, GitHub or Instagram link or handle.";
  }
  if (step === 1) Object.assign(e, validateAnswers("technical", composeAnswers(f), "universal").errors);
  if (step === CLASS_STEP && !f.domain) e.domain = "Choose the domain you want to join.";
  if (step === ROUND_STEP && f.domain) Object.assign(e, validateAnswers(f.domain, composeAnswers(f), "domain").errors);
  if (step === 4 && !f.consent) e.consent = "Consent is required to submit.";
  return e;
}

/** Every level at once: what a submit checks, however the player got to the last screen. */
function validateAll(f: FormData): Errors {
  const e: Errors = {};
  for (let s = 0; s <= LAST_STEP; s++) Object.assign(e, validate(f, s));
  return e;
}

/** Only the errors that belong to the given fields. */
const only = (e: Errors, keys: string[]): Errors => Object.fromEntries(keys.filter((k) => e[k]).map((k) => [k, e[k]]));

/** The note to open when a level is shown: the first one that is not pinned yet. */
const firstOpen = (level: number, domain: DomainId | "", pinned: string[]): string | null =>
  notesForLevel(level, domain).find((n) => !pinned.includes(n.key))?.key ?? null;

// ---------------------------------------------------------------- draft autosave
const DRAFT_KEY = "andropedia_recruitment_draft_v2";
const DRAFT_KEY_V1 = "andropedia_recruitment_draft_v1";
const DRAFT_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // the draft holds personal details, so it does not linger on shared computers
interface Draft { form: FormData; step: number; reached: number; pinned: string[] }

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** An old v1 draft (name, email, year, portfolio link, domain). Its free-text answers no longer map to a question, so they are dropped. */
function loadV1Draft(): Draft | null {
  const raw = window.localStorage.getItem(DRAFT_KEY_V1);
  if (!raw) return null;
  const d = JSON.parse(raw);
  if (d?.v !== 1 || typeof d.savedAt !== "number" || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) return null;
  const f = d.form ?? {};
  const form: FormData = {
    ...EMPTY,
    name: str(f.name, 80),
    email: str(f.email, 160),
    year: YEARS.includes(f.year) ? f.year : "second",
    profile: str(f.portfolioUrl, 300),
    domain: DOMAIN_IDS.includes(f.domain) ? f.domain : "",
  };
  return form.name || form.email ? { form, step: 0, reached: 0, pinned: [] } : null;
}

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return loadV1Draft();
    const d = JSON.parse(raw);
    if (d?.v !== 2 || typeof d.savedAt !== "number" || Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) return null;
    const f = d.form ?? {};
    const answers: Record<string, Answer> = {};
    const other: Record<string, string> = {};
    for (const id of ALL_QUESTION_IDS) {
      const v = f.answers?.[id];
      if (typeof v === "string") answers[id] = v.slice(0, 1200);
      else if (Array.isArray(v)) answers[id] = v.filter((x: unknown) => typeof x === "string").slice(0, 10);
      if (typeof f.other?.[id] === "string") other[id] = f.other[id].slice(0, 200);
    }
    const domain: FormData["domain"] = DOMAIN_IDS.includes(f.domain) ? f.domain : "";
    // Keep only the chosen domain's answers, so a restored draft can never carry two domains.
    const allowed = new Set([...UNIVERSAL_IDS, ...domainQuestions(domain).map((q) => q.id)]);
    for (const id of Object.keys(answers)) {
      if (!allowed.has(id)) {
        delete answers[id];
        delete other[id];
      }
    }
    const form: FormData = {
      name: str(f.name, 80),
      registerNo: str(f.registerNo, 30),
      department: str(f.department, 60),
      year: YEARS.includes(f.year) ? f.year : "second",
      phone: "", // not saved in drafts (see saveDraft)
      email: str(f.email, 160),
      profile: str(f.profile, 300),
      domain,
      answers,
      other,
      consent: false, // consent is always asked again
      website: "",
    };
    const filled = form.name || form.email || form.domain || Object.keys(answers).length > 0;
    if (!filled) return null;
    const step = Number.isInteger(d.step) ? Math.min(Math.max(d.step, 0), LAST_STEP - 1) : 0;
    const safeStep = step >= ROUND_STEP && !form.domain ? CLASS_STEP : step;
    // Drafts saved before levels existed have no `reached`: everything before the saved step counts as cleared.
    const savedReached = Number.isInteger(d.reached) ? Math.min(Math.max(d.reached, 0), LAST_STEP) : safeStep;
    const reached = Math.max(safeStep, form.domain ? savedReached : Math.min(savedReached, CLASS_STEP));

    // Pinned notes. Drafts from before the pin board have none: a note counts as pinned when its level was cleared and it is valid.
    const validKeys = new Set(NOTE_LEVELS.flatMap((l) => notesForLevel(l, domain).map((n) => n.key)));
    const saved: string[] | null = Array.isArray(d.pinned)
      ? d.pinned.filter((k: unknown): k is string => typeof k === "string" && validKeys.has(k)).slice(0, 40)
      : null;
    const pinned =
      saved ??
      NOTE_LEVELS.filter((l) => l < reached).flatMap((l) => {
        const errs = validate(form, l);
        return notesForLevel(l, domain).filter((n) => n.keys.every((k) => !errs[k])).map((n) => n.key);
      });
    return { form, step: safeStep, reached, pinned };
  } catch {
    return null; // storage unavailable or corrupt: just start fresh
  }
}

function saveDraft(form: FormData, step: number, reached: number, pinned: string[]) {
  try {
    // Consent is always asked again, the honeypot is not an answer, and the phone number is never kept in the browser.
    const { consent, website, phone, ...rest } = form;
    void consent; void website; void phone;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 2, savedAt: Date.now(), step, reached, pinned, form: rest }));
  } catch {
    /* storage full or blocked: autosave is best-effort */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(DRAFT_KEY_V1);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- shared bits
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70";

const noopSubscribe = () => () => {};
/** False during server render and hydration, true afterwards (no effect + setState needed). */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

const tiltStyle = (deg: number) => ({ "--tilt": `${deg}deg` }) as React.CSSProperties;

/** "Tap" on touch screens, "Click" on desktop. */
const Tap = () => (
  <>
    <span className="lg:hidden">Tap</span>
    <span className="hidden lg:inline">Click</span>
  </>
);

function StepHeader({ title, blurb, headingRef }: { title: string; blurb: string; headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="pb-h">{title}</h2>
      <p className="pb-lead">{blurb}</p>
    </div>
  );
}

/** A labelled input row with its error underneath. */
function BField({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <>
      <label className="pb-fl" htmlFor={id}>{label}</label>
      {hint && <p id={`${id}-hint`} className="pb-nh">{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="pb-err-msg">{error}</p>}
    </>
  );
}

// ---------------------------------------------------------------- one question, as the open note's body
interface QuestionFieldProps {
  q: Question;
  value: Answer | undefined;
  otherText: string;
  error?: string;
  onChange: (value: Answer) => void;
  onOtherText: (text: string) => void;
}

/** Short options sit side by side as tokens; long ones stack as rows. */
const SHORT_OPTIONS = (options: string[]) => options.every((o) => o.length <= 26);

function QuestionField({ q, value, otherText, error, onChange, onOtherText }: QuestionFieldProps) {
  const id = `q-${q.id}`;
  const star = q.required ? " *" : "";
  const describedBy = [error ? `${id}-error` : "", q.hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  const text = typeof value === "string" ? value : "";

  const heading = (htmlFor?: string) => (
    <>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="pb-nl" style={{ display: "block" }}>{q.label}{star}</label>
      ) : (
        <legend className="pb-nl" style={{ padding: 0 }}>{q.label}{star}</legend>
      )}
      {q.hint && <p id={`${id}-hint`} className="pb-nh">{q.hint}</p>}
    </>
  );
  const errorLine = error ? <p id={`${id}-error`} className="pb-err-msg">{error}</p> : null;

  if (q.kind === "text" || q.kind === "textarea" || q.kind === "url") {
    const common = {
      id,
      "aria-required": q.required || undefined,
      "aria-invalid": error ? (true as const) : undefined,
      "aria-describedby": describedBy,
      maxLength: q.maxLen,
      value: text,
      className: "pb-in",
      placeholder: "placeholder" in q ? q.placeholder : undefined,
    };
    const min = q.kind === "textarea" ? q.min ?? 0 : 0;
    const used = text.trim().length;
    const pick = (starter: string) => {
      sfx.select();
      const next = (text.trim() ? text.replace(/\s*$/, " ") : "") + starter;
      onChange(next.slice(0, q.maxLen));
      requestAnimationFrame(() => {
        const el = document.getElementById(id) as HTMLTextAreaElement | null;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      });
    };
    return (
      <div>
        {heading(id)}
        {q.kind === "textarea" ? (
          <textarea {...common} rows={q.maxLen > 500 ? 4 : 3} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input {...common} style={{ marginTop: 10 }} type={q.kind === "url" ? "url" : "text"} inputMode={q.kind === "url" ? "url" : undefined}
            onChange={(e) => onChange(e.target.value)} />
        )}
        {q.kind === "textarea" && min > 0 && <PowerBar length={used} min={min} />}
        {q.kind === "textarea" && used < Math.max(min, 1) && (
          <StarterChips starters={STARTERS[q.id] ?? DEFAULT_STARTERS} onPick={pick} label={`Sentence starters for: ${q.label}`} />
        )}
        {q.kind === "textarea" && (
          <div className="pb-row" style={{ marginTop: 8 }}>
            <p className="pb-fun" style={{ margin: 0 }}>{FUN_LINE}</p>
            <span className="pb-count" aria-hidden="true">{text.length}/{q.maxLen}</span>
          </div>
        )}
        {errorLine}
      </div>
    );
  }

  if (q.kind === "choice" || q.kind === "multi") {
    const multi = q.kind === "multi";
    const options = q.kind === "choice" && q.other ? [...q.options, OTHER] : q.options;
    const picked = Array.isArray(value) ? value : [];
    const short = SHORT_OPTIONS(options);
    return (
      <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }} aria-describedby={describedBy}>
        {heading()}
        <div className={short ? "pb-segs" : "pb-opts"}>
          {options.map((opt, i) => {
            const checked = multi ? picked.includes(opt) : value === opt;
            return (
              <label key={opt} className={`${short ? "pb-tok" : `pb-opt${multi ? " multi" : ""}`} ${checked ? "on" : ""}`}>
                <input
                  id={`${id}-${i}`}
                  className="pb-sr"
                  type={multi ? "checkbox" : "radio"}
                  name={id}
                  value={opt}
                  checked={checked}
                  onChange={() => {
                    sfx.select();
                    if (multi) onChange(checked ? picked.filter((p) => p !== opt) : [...picked, opt]);
                    else onChange(opt);
                  }}
                />
                <span className="sq" aria-hidden="true" />
                {opt}
              </label>
            );
          })}
        </div>
        {q.kind === "choice" && q.other && value === OTHER && (
          <input type="text" maxLength={200} value={otherText} aria-label={`${q.label} (other)`} placeholder="Tell us in a few words"
            aria-invalid={error ? true : undefined} onChange={(e) => onOtherText(e.target.value)} className="pb-in" style={{ marginTop: 10 }} />
        )}
        {errorLine}
      </fieldset>
    );
  }

  // scale
  const steps = Array.from({ length: q.to - q.from + 1 }, (_, i) => q.from + i);
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }} aria-describedby={describedBy}>
      {heading()}
      <div className="pb-scl">
        {steps.map((n) => {
          const checked = text === String(n);
          return (
            <label key={n} className={`pb-sc ${checked ? "on" : ""}`}>
              <input id={`${id}-${n}`} type="radio" name={id} value={n} checked={checked} aria-label={`${n} of ${q.to}`}
                onChange={() => {
                  sfx.select((n - q.from) / Math.max(1, q.to - q.from));
                  onChange(String(n));
                }} className="pb-sr" />
              <span aria-hidden="true">{n}</span>
            </label>
          );
        })}
      </div>
      <div className="pb-ends">
        <span>{q.from}: {q.lowLabel}</span>
        <span style={{ textAlign: "right" }}>{q.to}: {q.highLabel}</span>
      </div>
      {errorLine}
    </fieldset>
  );
}

// ---------------------------------------------------------------- board pieces
interface BoardItem {
  key: string;
  node: ReactNode;
  /** Lit cords join two pinned notes. */
  lit: boolean;
}

/** Notes hanging from cords. One column on a phone; two on a wide screen. */
function Board({ items, className = "" }: { items: BoardItem[]; className?: string }) {
  return (
    <div className={`pb-board wide ${className}`}>
      {items.map((it, i) => (
        <div key={it.key} className={`pb-cell ${i + 2 >= items.length ? "no-col" : ""}`}>
          {it.node}
          {i + 1 < items.length && <div className={`pb-cord seq ${it.lit && items[i + 1].lit ? "" : "off"}`} aria-hidden="true" />}
          {i + 2 < items.length && <div className={`pb-cord col ${it.lit && items[i + 2].lit ? "" : "off"}`} aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

function Meter({ filled, total, label }: { filled: number; total: number; label: string }) {
  return (
    <div className="pb-meter">
      <div className="pb-bar" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => <i key={i} className={i < filled ? "f" : undefined} />)}
      </div>
      <span className="pb-mt">{label}</span>
    </div>
  );
}

function StampBadge({ text, big }: { text: string; big: boolean }) {
  return (
    <span className="pb-stamp-wrap" aria-hidden="true">
      <span className={`pb-stamp pop ${big ? "big" : ""}`}>{text}</span>
    </span>
  );
}

// ---------------------------------------------------------------- cycle banner
function CycleBanner({ cycle, daysLeft }: { cycle: CycleInfo; daysLeft: number | null }) {
  if (cycle.state !== "open" || !cycle.closesAt) return null;
  const urgent = daysLeft !== null && daysLeft <= 3;
  return (
    <p className={`flex items-center gap-2 rounded-sm border px-4 py-3 text-xs sm:text-sm ${urgent ? "border-amber-400/40 bg-amber-500/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"}`}>
      <CalendarClock className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        Applications close on <strong>{formatDate(cycle.closesAt)}</strong>
        {daysLeft !== null && daysLeft <= 14 && (daysLeft <= 0 ? " (today)" : ` (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left)`)}.
      </span>
    </p>
  );
}

function ClosedPanel({ cycle }: { cycle: CycleInfo }) {
  const upcoming = cycle.state === "upcoming";
  return (
    <div className="glass-card p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6 text-slate-300" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold text-white">{upcoming ? "Applications open soon" : "Applications are closed"}</h2>
      <p className="text-sm text-slate-300 leading-relaxed">
        {upcoming && cycle.opensAt ? `Applications open on ${formatDate(cycle.opensAt)}.` : cycle.message}{" "}
        Follow the club for the next recruitment announcement.
      </p>
      <Link href="/" className={`btn-glass ${ring}`}>
        Back to home
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------- the form
export function JoinForm() {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div aria-busy="true" aria-label="Loading the application form" className="pb mx-auto w-full max-w-xl space-y-4 animate-pulse lg:max-w-5xl">
        <div className="h-4 w-32 bg-white/10" />
        <div className="h-24 bg-white/5" />
        <div className="space-y-6 border-4 border-[#001a66] bg-[#000d33] p-4">
          <div className="h-28 bg-white/10" />
          <div className="h-28 bg-white/10" />
        </div>
      </div>
    );
  }
  return <ApplicationForm initialDraft={loadDraft()} />;
}

function ApplicationForm({ initialDraft }: { initialDraft: Draft | null }) {
  const [form, setForm] = useState<FormData>(initialDraft?.form ?? EMPTY);
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  /** Furthest level reached. Every level before it is cleared and can be revisited. */
  const [reached, setReached] = useState(initialDraft?.reached ?? 0);
  /** Keys of the notes that are pinned. A pinned note is a finished answer. */
  const [pinned, setPinned] = useState<string[]>(initialDraft?.pinned ?? []);
  /** The one note that is open for editing, if any. */
  const [openKey, setOpenKey] = useState<string | null>(() =>
    firstOpen(initialDraft?.step ?? 0, initialDraft?.form.domain ?? "", initialDraft?.pinned ?? []));
  /** What Thambi says after a note is pinned or a level is cleared, until the player changes something. */
  const [andyMsg, setAndyMsg] = useState<string | null>(null);
  const [stamp, setStamp] = useState<{ id: number; key: string; text: string; big: boolean } | null>(null);
  const [restored, setRestored] = useState(initialDraft !== null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [reference, setReference] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [cycle, setCycle] = useState<CycleInfo | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const { toasts, push, dismiss } = useToasts(initialDraft ? ["Draft restored. Pick up where you left off."] : []);

  const topRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevStep = useRef(step);
  const stampId = useRef(0);

  const domain = RECRUIT_DOMAINS.find((d) => d.id === form.domain);
  const questionsForDomain = domainQuestions(form.domain);
  const klass = form.domain ? DOMAIN_CLASS[form.domain] : null;
  const accent = klass ? DOMAIN_ACCENT[klass.type] : ACCENTS.blue;
  const initial = form.name.trim().charAt(0) || "?";

  const answered = (n: NoteDef) => !!n.question && String(form.answers[n.question.id] ?? "").trim() !== "";
  const bonusCount = [...UNIVERSAL_QUESTIONS, ...questionsForDomain].filter((q) => !q.required && String(form.answers[q.id] ?? "").trim()).length;

  // Cosmetic XP: each pinned note is worth its share of its level's 100 XP, and the class is worth a full level.
  const levelXp = (level: number) => {
    const notes = notesForLevel(level, form.domain);
    const worth = noteXp(notes);
    return notes.filter((n) => pinned.includes(n.key) && (!n.optional || answered(n))).reduce((sum, n) => sum + worth[n.key], 0);
  };
  const xp = submitted ? LEVELS.length * LEVEL_XP + bonusCount * BONUS_XP : levelXp(0) + levelXp(1) + (form.domain ? LEVEL_XP : 0) + levelXp(ROUND_STEP);

  // Autosave (debounced). Not while showing the confirmation screen.
  useEffect(() => {
    if (submitted) return;
    const t = window.setTimeout(() => saveDraft(form, step, reached, pinned), 600);
    return () => window.clearTimeout(t);
  }, [form, step, reached, pinned, submitted]);

  // Deadline / open-close state from the server.
  const loadCycle = () =>
    fetch("/api/recruitment/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((c: CycleInfo & { success?: boolean }) => {
        setCycle(c);
        setDaysLeft(c.closesAt ? Math.ceil((Date.parse(c.closesAt) - Date.now()) / 86_400_000) : null);
      })
      .catch(() => undefined); // if the check fails, assume open: the server enforces it anyway
  useEffect(() => {
    void loadCycle();
  }, []);

  // Move focus to the step heading whenever the step differs from the previous one.
  useEffect(() => {
    if (prevStep.current === step) return;
    prevStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // A stamp lands, then fades after 1.2s.
  useEffect(() => {
    if (!stamp) return;
    const t = window.setTimeout(() => setStamp(null), 1300);
    return () => window.clearTimeout(t);
  }, [stamp]);

  // The success screen: big confetti once, and focus its heading.
  useEffect(() => {
    if (!submitted) return;
    headingRef.current?.focus({ preventScroll: true });
    void fireConfetti("big", [accent.a1, accent.a2, "#ffffff"]);
    sfx.victory();
  }, [submitted, accent.a1, accent.a2]);

  const clearError = (key: string) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  const focusLater = (key: string | undefined) => {
    if (key) window.setTimeout(() => document.getElementById(focusId(key))?.focus(), 40);
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
    setAndyMsg(null);
  };
  const setAnswer = (id: string, value: Answer) => {
    setForm((prev) => ({ ...prev, answers: { ...prev.answers, [id]: value } }));
    clearError(id);
    setAndyMsg(null);
  };
  const setOther = (id: string, text: string) => {
    setForm((prev) => ({ ...prev, other: { ...prev.other, [id]: text } }));
    clearError(id);
  };

  // Only one domain per application: switching domain drops the previous domain's answers and pinned notes.
  const chooseDomain = (id: DomainId) => {
    if (form.domain !== id) {
      const drop = new Set(domainNoteKeys(form.domain));
      setPinned((p) => p.filter((k) => !drop.has(k)));
      // A new class means a new round: the domain round is no longer cleared.
      setReached((r) => Math.min(r, ROUND_STEP));
      setAndyMsg(ANDY_CHEER[CLASS_STEP]);
      sfx.classLock();
    }
    setForm((prev) => {
      if (prev.domain === id) return prev;
      const keep = (rec: Record<string, never> | Record<string, unknown>) =>
        Object.fromEntries(Object.entries(rec).filter(([k]) => UNIVERSAL_IDS.has(k)));
      return { ...prev, domain: id, answers: keep(prev.answers) as FormData["answers"], other: keep(prev.other) as FormData["other"] };
    });
    clearError("domain");
  };

  /** Shows a level. `open` picks the note to open (default: the first unpinned one). */
  const goToStep = (next: number, cheer: string | null = null, open?: string | null, pinnedNow: string[] = pinned) => {
    setStep(next);
    setAndyMsg(cheer);
    setServerError("");
    setOpenKey(open === undefined ? firstOpen(next, form.domain, pinnedNow) : open);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Unpins the first note of a level that has an error in `errs` (or the first note) and opens it. */
  const openErroredNote = (level: number, errs: Errors) => {
    const notes = notesForLevel(level, form.domain);
    const target = notes.find((n) => n.keys.some((k) => errs[k])) ?? notes[0];
    const nextPinned = target ? pinned.filter((k) => k !== target.key) : pinned;
    setPinned(nextPinned);
    goToStep(level, null, target?.key ?? null, nextPinned);
    focusLater(target?.keys.find((k) => errs[k]) ?? target?.keys[0]);
  };

  const flagKey = (n: NoteDef) => `note:${n.key}`;
  const noteError = (n: NoteDef): string | undefined => n.keys.map((k) => errors[k]).find(Boolean) ?? errors[flagKey(n)];

  // ---- note actions
  const openNote = (n: NoteDef) => {
    sfx.unpin();
    setPinned((p) => p.filter((k) => k !== n.key));
    setOpenKey(n.key);
    setAndyMsg(null);
    setErrors((prev) => ({ ...prev, [flagKey(n)]: undefined }));
    focusLater(n.keys[0]);
  };

  const pinNote = (n: NoteDef) => {
    const found = only(validate(form, n.level), n.keys);
    if (Object.keys(found).length > 0) {
      sfx.error();
      setErrors((prev) => ({ ...prev, ...found }));
      setAndyMsg(null);
      focusLater(n.keys.find((k) => found[k]));
      return;
    }
    const notes = notesForLevel(n.level, form.domain);
    const worth = noteXp(notes)[n.key];
    const nextPinned = pinned.includes(n.key) ? pinned : [...pinned, n.key];
    const cleared = !n.optional && notes.every((x) => x.optional || nextPinned.includes(x.key));
    const skipped = n.optional && !answered(n);
    if (cleared) sfx.boardClear();
    else if (skipped) sfx.select();
    else sfx.pin();
    setPinned(nextPinned);
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of n.keys) delete next[k];
      delete next[flagKey(n)];
      return next;
    });
    stampId.current += 1;
    setStamp({ id: stampId.current, key: n.key, text: cleared ? `Board cleared +${LEVEL_XP} XP` : skipped ? "Skipped" : `Pinned +${worth} XP`, big: cleared });
    const index = notes.findIndex((x) => x.key === n.key) + 1;
    setAndyMsg(cleared ? `Board cleared! +${LEVEL_XP} XP. Hit Continue.` : skipped ? `Note ${index} of ${notes.length} skipped.` : `Note ${index} of ${notes.length} pinned. +${worth} XP.`);
    const next = notes.find((x) => !nextPinned.includes(x.key));
    setOpenKey(next?.key ?? null);
    focusLater(next?.keys[0]);
  };

  /** Enter in a single-line field pins the open note instead of submitting the form. */
  const pinOnEnter = (n: NoteDef) => (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target;
    if (e.key !== "Enter" || !(t instanceof HTMLInputElement) || ["radio", "checkbox"].includes(t.type)) return;
    e.preventDefault();
    pinNote(n);
  };

  const handleNext = () => {
    const found = validate(form, step);
    const notes = notesForLevel(step, form.domain);
    // A note that was never pinned is flagged, never skipped.
    for (const n of notes) {
      if (!n.optional && !pinned.includes(n.key) && !n.keys.some((k) => found[k])) found[flagKey(n)] = "Pin this note to continue.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) {
      sfx.error();
      const flagged = notes.find((n) => n.keys.some((k) => found[k]) || found[flagKey(n)]);
      if (flagged) {
        setPinned((p) => p.filter((k) => k !== flagged.key));
        setOpenKey(flagged.key);
        focusLater(flagged.keys.find((k) => found[k]) ?? flagged.keys[0]);
      } else if (step === CLASS_STEP) {
        focusLater("domain");
      }
      return;
    }
    const next = step + 1;
    if (next > reached) {
      setReached(next);
      void fireConfetti("small", [accent.a1, accent.a2, "#ffffff"]);
      sfx.levelUp();
    } else {
      sfx.tile();
    }
    goToStep(next, ANDY_CHEER[step] || null);
  };

  const startOver = () => {
    sfx.unpin();
    clearDraft();
    setForm(EMPTY);
    setErrors({});
    setPinned([]);
    setOpenKey(firstOpen(0, "", []));
    setStep(0);
    setReached(0);
    setAndyMsg(null);
    setRestored(false);
    push("Draft cleared.");
  };

  /** Review's Edit: unpins the first note of that level and jumps back to it. */
  const editLevel = (level: number) => {
    const first = notesForLevel(level, form.domain)[0];
    const nextPinned = first ? pinned.filter((k) => k !== first.key) : pinned;
    setPinned(nextPinned);
    goToStep(level, null, first?.key ?? null, nextPinned);
    focusLater(first?.keys[0]);
  };

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      sfx.copy();
      push("Reference ID copied.", "success");
    } catch {
      push("Couldn't copy. Please select and copy the ID manually.", "error");
    }
  };

  const submit = async () => {
    // Re-check every level, not just the last one, so nothing slips through a stale step.
    const found = validateAll(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      sfx.error();
      const firstStep = [0, 1, 2, 3, 4].find((s) => stepKeys(s, form.domain).some((k) => found[k])) ?? LAST_STEP;
      if (firstStep !== step) openErroredNote(firstStep, found);
      else focusLater(stepKeys(firstStep, form.domain).find((k) => found[k]));
      return;
    }
    if (!form.domain) return;

    // Send the universal answers plus the chosen domain's only, as typed (multi-selects stay lists).
    const allowed = new Set([...UNIVERSAL_IDS, ...domainQuestions(form.domain).map((q) => q.id)]);
    const answers = Object.fromEntries(Object.entries(composeAnswers(form)).filter(([id]) => allowed.has(id)));

    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          registerNo: form.registerNo,
          department: form.department,
          year: form.year,
          phone: form.phone,
          email: form.email,
          profile: form.profile,
          domain: form.domain,
          answers,
          consent: form.consent,
          website: form.website,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        clearDraft();
        setReference(data.reference);
        setSubmitted(true);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      sfx.error();
      if (res.status === 403) {
        void loadCycle(); // closed while the form was open: show the closed state
        setServerError(data?.error || "Applications are not being accepted right now.");
      } else if (res.status === 409) {
        const conflict: Errors = { email: data?.error || "An application with this email already exists." };
        setErrors(conflict);
        openErroredNote(0, conflict);
      } else if (res.status === 429) {
        const wait = Number(res.headers.get("Retry-After"));
        setServerError(
          `${data?.error || "Too many attempts."}${Number.isFinite(wait) && wait > 0 ? ` Try again in about ${Math.ceil(wait / 60)} minute(s).` : ""}`
        );
      } else if (data?.fieldErrors) {
        const fe = data.fieldErrors as Record<string, string[]>;
        const mapped: Errors = {};
        for (const key of Object.keys(fe)) mapped[key] = fe[key][0];
        const firstStep = [0, 1, 2, 3].find((s) => stepKeys(s, form.domain).some((k) => mapped[k]));
        setErrors(mapped);
        if (firstStep !== undefined) openErroredNote(firstStep, mapped);
        setServerError(data.error || "Please check the highlighted fields.");
      } else {
        setServerError(data?.error || "Something went wrong. Please try again.");
      }
    } catch {
      sfx.error();
      setServerError("Network error. Please check your connection and try again. Your answers are still here.");
      push("You appear to be offline.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- states other than the form
  if (submitted) {
    return (
      <>
        <div ref={topRef} className="scroll-mt-24" />
        <div className="pb mx-auto flex w-full max-w-xl flex-col gap-4 lg:max-w-3xl lg:gap-6">
          <div className="flex items-center justify-between gap-3">
            <p className="pb-eyebrow">Quest complete</p>
            <XpChip xp={xp} />
          </div>
          <GameBoard current={LAST_STEP} reached={LAST_STEP} initial={initial} finished />

          <div role="status">
            <h2 ref={headingRef} tabIndex={-1} className="pb-h">Application received!</h2>
            <p className="pb-lead">We have received your application. Join our community and stay tuned for the domain challenges.</p>
          </div>

          <div className="pb-board" aria-hidden="true">
            <div className="pb-note pinned" style={{ ...tiltStyle(TILTS[0]), paddingBottom: 30 }}>
              <span className="pb-pin on" />
              <p className="pb-nt">Player card</p>
              <div className="pb-who">
                <div className="pb-card-pic">{initial}</div>
                <div>
                  <p className="pb-nl" style={{ fontSize: 20, lineHeight: "24px", overflowWrap: "anywhere" }}>{form.name}</p>
                  <div className="pb-tags">
                    {klass && <span className="pb-tag">{klass.title}</span>}
                    <span className="pb-tag">{xp} XP</span>
                  </div>
                </div>
              </div>
              <span className="pb-stamp-wrap"><span className="pb-stamp big">Received</span></span>
            </div>
            <div className="pb-cord" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 14px", alignItems: "start" }}>
              {["Basics", "Vibe", "Class", "Round"].map((label, i) => (
                <div key={label} className="pb-mini" style={{ ...tiltStyle(i % 2 ? 1.2 : -1.4), marginTop: i % 2 ? 14 : 0 }}>
                  <span className="pb-pin on" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p className="pb-para">
            Thank you for applying to Andropedia, <b>{form.name}</b>. Our <b>{domain?.name}</b> domain leads will review it.
            {" "}We&apos;re sending a confirmation email to <b style={{ overflowWrap: "anywhere" }}>{form.email}</b>. It usually arrives within a minute;
            if you don&apos;t see it, check your spam folder and keep the reference ID below.{" "}
            Shortlisted candidates will be contacted by email.
          </p>

          <div className="pb-ref">
            <span>Reference ID: <b>{reference}</b></span>
            <button type="button" onClick={copyReference} className="pb-cp">
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy
            </button>
          </div>

          {WHATSAPP_URL && (
            <div className="pb-wa">
              <p className="pb-wa-msg">Join our WhatsApp community</p>
              <a className="pb-wa-btn" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                <WhatsappIcon className="h-6 w-6 shrink-0 text-white" />
                Join now
              </a>
            </div>
          )}

          <Link href="/" className="pb-btn outline">
            Back to home
          </Link>
        </div>
        <ToastRegion toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  if (cycle && cycle.state !== "open") {
    return <ClosedPanel cycle={cycle} />;
  }

  // ---- the pin board
  const err = (key: string) => errors[key];
  const a11y = (key: string, id: string, hasHint = false) => ({
    id,
    "aria-invalid": err(key) ? (true as const) : undefined,
    "aria-describedby": [hasHint ? `${id}-hint` : "", err(key) ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined,
  });
  const answerText = (q: Question) => {
    const v = composeAnswers(form)[q.id];
    const text = Array.isArray(v) ? v.join(", ") : (v ?? "");
    return text || "Not answered";
  };

  const levelNotes = notesForLevel(step, form.domain);
  const required = levelNotes.filter((n) => !n.optional);
  const pinnedRequired = required.filter((n) => pinned.includes(n.key)).length;
  const nextUp = levelNotes.find((n) => n.key !== openKey && !pinned.includes(n.key))?.key;
  const worthOf = noteXp(levelNotes);

  /** Preview of an answered note, one short line. */
  const preview = (n: NoteDef): string => {
    switch (n.key) {
      case "who": return `${form.name} · ${form.registerNo}`;
      case "campus": return `${form.department} · ${YEAR_LABELS[form.year]}`;
      case "reach": return `${form.phone} · ${form.email}`;
      case "proof": return form.profile;
      default: return n.question ? answerText(n.question) : "";
    }
  };

  /** The body of the open note. */
  const noteBody = (n: NoteDef): ReactNode => {
    if (n.question) {
      const q = n.question;
      return (
        <QuestionField q={q} value={form.answers[q.id]} otherText={form.other[q.id] ?? ""} error={err(q.id)}
          onChange={(value) => setAnswer(q.id, value)} onOtherText={(text) => setOther(q.id, text)} />
      );
    }
    switch (n.key) {
      case "who":
        return (
          <>
            <BField id="f-name" label="Full Name *" hint="The one on your ID card, not your gamer tag" error={err("name")}>
              <input {...a11y("name", "f-name", true)} className="pb-in" aria-required="true" type="text" autoComplete="name" enterKeyHint="next" placeholder="e.g. Aarav Sharma"
                value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </BField>
            <BField id="f-registerNo" label="Register / Roll Number *" error={err("registerNo")}>
              <input {...a11y("registerNo", "f-registerNo")} className="pb-in" aria-required="true" type="text" autoComplete="off" enterKeyHint="next" placeholder="e.g. RA2511026020025"
                value={form.registerNo} onChange={(e) => setField("registerNo", e.target.value)} />
            </BField>
          </>
        );
      case "campus":
        return (
          <>
            <BField id="f-department" label="Department & Section *" error={err("department")}>
              <input {...a11y("department", "f-department")} className="pb-in" aria-required="true" type="text" autoComplete="off" enterKeyHint="next" placeholder="e.g. CSE AIML A"
                value={form.department} onChange={(e) => setField("department", e.target.value)} />
            </BField>
            <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
              <legend className="pb-fl">Year *</legend>
              <div className="pb-segs" style={{ marginTop: 0 }}>
                {YEARS.map((y, i) => {
                  const checked = form.year === y;
                  return (
                    <label key={y} className={`pb-tok ${checked ? "on" : ""}`}>
                      <input id={i === 0 ? "f-year" : undefined} className="pb-sr" type="radio" name="year" value={y} checked={checked} onChange={() => { sfx.select(); setField("year", y); }} />
                      {YEAR_LABELS[y]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </>
        );
      case "reach":
        return (
          <>
            <BField id="f-phone" label="Phone / WhatsApp Number *" hint="The one you actually check at midnight" error={err("phone")}>
              <input {...a11y("phone", "f-phone", true)} className="pb-in" aria-required="true" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" placeholder="e.g. +91 98765 43210"
                value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </BField>
            <BField id="f-email" label="Email Address *" hint="Ideally not the inbox drowning in circulars" error={err("email")}>
              <input {...a11y("email", "f-email", true)} className="pb-in" aria-required="true" type="email" inputMode="email" autoComplete="email" enterKeyHint="next" placeholder="you@example.com"
                value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </BField>
          </>
        );
      default:
        return (
          <BField id="f-profile" label="LinkedIn / GitHub / Instagram *" hint="Drop whichever shows off your best side; we will stalk it" error={err("profile")}>
            <input {...a11y("profile", "f-profile", true)} className="pb-in" aria-required="true" type="text" autoComplete="off" enterKeyHint="done" placeholder="Paste a link or @handle"
              value={form.profile} onChange={(e) => setField("profile", e.target.value)} />
          </BField>
        );
    }
  };

  const renderNote = (n: NoteDef, i: number): BoardItem => {
    const isOpen = openKey === n.key;
    const isPinned = pinned.includes(n.key);
    const msg = noteError(n);
    const hasError = !!msg;
    const base = `${n.optional ? "bonus" : ""}`;

    if (isOpen) {
      return {
        key: n.key,
        lit: false,
        node: (
          <div className={`pb-note open ${base} ${hasError ? "err" : ""}`} role="group" aria-label={`${n.tag}. ${n.question ? n.question.label : n.title}`} onKeyDown={pinOnEnter(n)}>
            <div className="pb-row">
              <p className="pb-nt">{n.tag}</p>
              <p className="pb-nt open-tag">Unpinned</p>
            </div>
            {!n.question && <p className="pb-nl">{n.title}</p>}
            {noteBody(n)}
            {errors[flagKey(n)] && <p className="pb-err-msg" role="alert">{errors[flagKey(n)]}</p>}
            <button type="button" className="pb-btn sm" onClick={() => pinNote(n)}>
              <Pin className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
              Pin it
            </button>
          </div>
        ),
      };
    }

    const state = hasError ? "err" : isPinned ? "pinned" : "";
    return {
      key: n.key,
      lit: isPinned && !hasError,
      node: (
        <button
          type="button"
          onClick={() => openNote(n)}
          className={`pb-note ${state} ${base}`}
          style={tiltStyle(TILTS[i % TILTS.length])}
          aria-label={`${n.tag}, ${n.title}. ${hasError ? `Needs a fix: ${msg}` : isPinned ? "Pinned" : "Not answered yet"}. Open to ${isPinned ? "edit" : "answer"}.`}
        >
          <span className={`pb-pin ${hasError ? "bad" : isPinned ? "on" : "off"}`} aria-hidden="true" />
          <span className="pb-row">
            <span className={`pb-nt ${hasError ? "bad" : ""}`}>{n.tag}{hasError ? " · Needs a fix" : ""}</span>
            {hasError ? null : isPinned ? (
              <span className="pb-ok" aria-hidden="true"><Check className="h-3.5 w-3.5" strokeWidth={3.5} /></span>
            ) : n.optional ? (
              <span className="pb-nup">+{BONUS_XP} XP</span>
            ) : nextUp === n.key ? (
              <span className="pb-nup">Next up</span>
            ) : null}
          </span>
          <span className="pb-nl">{n.title}</span>
          {hasError ? (
            <>
              <span className="pb-err-msg">{msg}</span>
              <span className="pb-nf bad"><Tap /> to unpin and fix →</span>
            </>
          ) : isPinned ? (
            <>
              <span className="pb-pv">{preview(n) || "No answer"}</span>
              <span className="pb-nf">+{worthOf[n.key]} XP · <Tap /> to unpin and edit</span>
            </>
          ) : (
            <>
              <span className="pb-nh">{n.hint}</span>
              <span className="pb-nf"><Tap /> to unpin and answer →</span>
            </>
          )}
          {stamp?.key === n.key && <StampBadge key={stamp.id} text={stamp.text} big={stamp.big} />}
        </button>
      ),
    };
  };

  // Thambi reacts to what is on this level right now.
  const stepErrors = stepKeys(step, form.domain).filter((k) => errors[k]).length + levelNotes.filter((n) => errors[flagKey(n)]).length;
  const mood: Mood = stepErrors > 0 || serverError ? "oops" : andyMsg ? "cheer" : "hi";
  const andyText =
    mood === "oops"
      ? serverError
        ? "The server said no, but your answers are safe here. Fix what it flagged and try again."
        : `Oops! ${stepErrors === 1 ? "One thing needs" : `${stepErrors} things need`} a fix before the next level.`
      : andyMsg
        ? andyMsg
        : step === ROUND_STEP && klass
          ? `Boss round, ${klass.title}! Be specific, we read every word.`
          : ANDY_HI[step];

  // ---- review: the player card, one note per level, and the pledge
  const reviewNote = (key: string, title: string, level: number, rows: Array<[string, string]>, i: number): BoardItem => ({
    key,
    lit: true,
    node: (
      <div className="pb-note pinned" style={tiltStyle(TILTS[i % TILTS.length])}>
        <span className="pb-pin on" aria-hidden="true" />
        <div className="pb-row">
          <p className="pb-nt">{title}</p>
          <button type="button" className="pb-edit" onClick={() => editLevel(level)} aria-label={`Edit ${title}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </button>
        </div>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    ),
  });

  const reviewItems: BoardItem[] = [
    {
      key: "card",
      lit: true,
      node: (
        <div className="pb-note pinned" style={tiltStyle(TILTS[0])}>
          <span className="pb-pin on" aria-hidden="true" />
          <p className="pb-nt">Player card</p>
          <div className="pb-who">
            <div className="pb-card-pic" aria-hidden="true">{initial}</div>
            <div>
              <p className="pb-nl" style={{ fontSize: 20, lineHeight: "24px", overflowWrap: "anywhere" }}>{form.name}</p>
              <div className="pb-tags">
                {klass && <span className="pb-tag">{klass.title}</span>}
                <span className="pb-tag">{YEAR_LABELS[form.year]}</span>
              </div>
            </div>
          </div>
          <p className="pb-nf">{xp} XP earned</p>
        </div>
      ),
    },
    reviewNote("basics", "Basics", 0, [
      ["Register no.", form.registerNo], ["Department", form.department], ["Phone", form.phone], ["Email", form.email], ["Profile", form.profile],
    ], 1),
    reviewNote("vibe", "Vibe check", 1, UNIVERSAL_QUESTIONS.map((q) => [q.label, answerText(q)] as [string, string]), 2),
    reviewNote("class", "Class", CLASS_STEP, [["Domain", `${domain?.name ?? ""}${klass ? ` · ${klass.title}` : ""}`]], 3),
    reviewNote("round", "Domain round", ROUND_STEP, questionsForDomain.map((q) => [q.label, answerText(q)] as [string, string]), 0),
    {
      key: "pledge",
      lit: form.consent,
      node: (
        <div className={`pb-note ${form.consent ? "pinned" : ""} ${err("consent") ? "err" : ""}`} style={tiltStyle(TILTS[2])}>
          <span className={`pb-pin ${err("consent") ? "bad" : form.consent ? "on" : "off"}`} aria-hidden="true" />
          <p className="pb-nt">Player&apos;s pledge</p>
          <label className="pb-pledge" htmlFor="consent">
            <input {...a11y("consent", "consent")} aria-required="true" type="checkbox" checked={form.consent} onChange={(e) => { if (e.target.checked) sfx.pin(); else sfx.unpin(); setField("consent", e.target.checked); }} />
            <span>I agree that Andropedia may store my application details and contact me by email about my application. *</span>
          </label>
          {err("consent") && <p id="consent-error" className="pb-err-msg">{err("consent")}</p>}
        </div>
      ),
    },
  ];

  // ---- choose your class: five notes dropped on the board
  const classCards = (
    <div className="pb-board classes loose">
      {RECRUIT_DOMAINS.map((d, i) => {
        const c = DOMAIN_CLASS[d.id];
        const on = form.domain === d.id;
        return (
          <label key={d.id} htmlFor={`domain-${d.id}`} className={`pb-post ${on ? "sel" : ""}`} style={tiltStyle(CLASS_TILTS[i % CLASS_TILTS.length])}>
            <span className={`pb-pin ${on ? "on" : "off"}`} aria-hidden="true" />
            <input
              id={`domain-${d.id}`} className="pb-rad" type="radio" name="domain" value={d.id} checked={on}
              aria-label={`${d.name}, ${c.title}`} aria-describedby={err("domain") ? "domain-error" : undefined}
              onChange={() => chooseDomain(d.id)}
            />
            <span className="pb-pic" aria-hidden="true">{d.name.charAt(0)}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="pb-nt">{d.name}</span>
              <span className="pb-nl">{c.title}</span>
              <span className="pb-nh">{c.tagline}</span>
              {on && <span className="pb-nh">{d.desc}</span>}
            </span>
            {on && (
              <span style={{ width: "100%", paddingTop: 4 }}>
                <span className="pb-lock-stamp">Class locked</span>
              </span>
            )}
          </label>
        );
      })}
      <div className="pb-gate">
        <Lock className="h-7 w-7 shrink-0" aria-hidden="true" />
        <div>
          <b>{klass ? "Level 4 · locked until you continue" : "Level 4 · pick a class to unlock it"}</b>
          <p>{klass && domain ? `${klass.title} round: ${questionsForDomain.length} notes` : "Your round depends on the class you choose."}</p>
        </div>
      </div>
    </div>
  );

  const titles = [
    "The basic bureaucracy",
    "Universal vibe check",
    "Choose your class",
    klass && domain ? `${klass.title}: the ${domain.name} round` : "Domain round",
    "Review your player card",
  ];
  const blurbs = [
    "Fill this out before your Wi-Fi cuts out. One application per email.",
    "Everyone answers these. There are no wrong answers, only revealing ones.",
    "Pick exactly one domain. It decides the questions you answer next, and the track you are evaluated in.",
    "Be specific and honest. We read every answer. Your progress is saved on this device as you go.",
    "Check everything. Only one application is allowed per email, so make it count.",
  ];

  const meter =
    step === LAST_STEP
      ? { filled: 4 + (form.consent ? 1 : 0), total: 5, label: form.consent ? "Pledge signed" : "Pledge pending" }
      : step === CLASS_STEP
        ? { filled: form.domain ? 1 : 0, total: 1, label: `Class ${form.domain ? 1 : 0}/1` }
        : { filled: pinnedRequired, total: required.length, label: `Pinned ${pinnedRequired}/${required.length}` };

  return (
    <>
      <div ref={topRef} className="scroll-mt-24" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < LAST_STEP) handleNext(); // Enter in a field pins a note or moves on instead of submitting early
          else void submit();
        }}
        noValidate
        className="pb mx-auto flex w-full max-w-xl flex-col gap-4 lg:max-w-5xl lg:gap-6"
      >
        {cycle && <CycleBanner cycle={cycle} daysLeft={daysLeft} />}

        {restored && (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-sky-400/30 bg-sky-500/5 px-4 py-3 text-xs sm:text-sm text-sky-100">
            <span>We saved your progress on this device and restored it.</span>
            <button type="button" onClick={startOver} className={`underline underline-offset-2 hover:text-white rounded ${ring}`}>
              Start over
            </button>
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="pb-eyebrow">Level {step + 1} of {LEVELS.length}<span className="hidden lg:inline"> · {LEVELS[step].label}</span></p>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <XpChip xp={xp} />
          </div>
        </div>
        <GameBoard current={step} reached={reached} initial={initial} onSelect={(i) => { sfx.tile(); goToStep(i); }} />
        <AndySays mood={mood} message={andyText} />

        {serverError && (
          <p role="alert" className="rounded-sm border border-rose-500/35 bg-rose-500/10 p-3 text-xs sm:text-sm text-rose-200">
            {serverError}
          </p>
        )}

        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4 lg:gap-6">
          <StepHeader title={titles[step]} blurb={blurbs[step]} headingRef={headingRef} />

          {step === CLASS_STEP ? (
            <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
              <legend className="sr-only">Choose your domain</legend>
              {classCards}
              {err("domain") && <p id="domain-error" className="pb-err-msg" style={{ color: "#fb7185" }} role="alert">{err("domain")}</p>}
            </fieldset>
          ) : step === LAST_STEP ? (
            <>
              <Board items={reviewItems} />
              {/* Honeypot: hidden from people and screen readers, bots tend to fill it */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={form.website} onChange={(e) => setField("website", e.target.value)} className="hidden" />
            </>
          ) : (
            <Board items={levelNotes.map(renderNote)} />
          )}
        </motion.div>

        <Meter {...meter} />

        <div className="pb-actions">
          {step < LAST_STEP ? (
            <button type="submit" className="pb-btn">
              Continue <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
            </button>
          ) : (
            <HoldToConfirm armed={form.consent} disabled={submitting} onStart={() => sfx.tile()} onConfirm={() => void submit()} onBlocked={() => void submit()}>
              <Send className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
              {submitting ? "Submitting..." : form.consent ? "Hold to submit" : "Submit application"}
            </HoldToConfirm>
          )}
          {step > 0 && (
            <button type="button" onClick={() => { sfx.tile(); goToStep(step - 1); }} className="pb-btn ghost">
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" /> Back
            </button>
          )}
        </div>
        {step !== CLASS_STEP && (
          <p className="pb-help">{step === LAST_STEP ? "Hold the button to confirm. Edit unpins that note and jumps you back to its level." : "Unpinned notes get flagged, never skipped."}</p>
        )}
      </form>
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
