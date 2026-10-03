// SHL-04: the application draft. The only thing this app keeps in browser storage.
// Raw form values (before schema normalisation), autosaved to localStorage, debounced 400ms.
// Every storage call is wrapped: with storage blocked the form still works, it just doesn't persist.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DRAFT_KEY, type ApplicationInput } from '@andropedia/shared';

export const AUTOSAVE_MS = 400;

type Achievement = { title: string; description: string };

/**
 * One key per payload field (PRD 8.2), plus `photoUrl` for showing the uploaded photo again.
 * The photo file itself never goes in here, and neither does the honeypot.
 */
export type DraftData = Partial<{
  name: string;
  registerNumber: string;
  email: string;
  phone: string;
  department: string;
  section: string;
  domainPref1: string;
  domainPref2: string;
  aboutYou: string;
  whyDomain: string;
  skills: string;
  techStack: string[];
  outsideAcademics: string;
  whyAndropedia: string;
  oneYearVision: string;
  workUrl: string;
  portfolioUrl: string;
  achievements: Achievement[];
  photoId: string;
  photoUrl: string;
  hoursPerWeek: number;
  responsibility: number;
  inOtherClub: boolean;
  otherClubs: string;
  clubShouldProvide: string;
  rememberUs: string;
}>;

// Compile-time check: draft keys are exactly the payload keys, minus the honeypot, plus photoUrl.
type DraftKey = Exclude<keyof ApplicationInput, 'website'> | 'photoUrl';
type SameKeys = [keyof DraftData] extends [DraftKey] ? ([DraftKey] extends [keyof DraftData] ? true : never) : never;
const _sameKeys: SameKeys = true;
void _sameKeys;

const DRAFT_FIELDS: Record<DraftKey, 'string' | 'number' | 'boolean' | 'strings' | 'achievements'> = {
  name: 'string', registerNumber: 'string', email: 'string', phone: 'string', department: 'string', section: 'string',
  domainPref1: 'string', domainPref2: 'string',
  aboutYou: 'string', whyDomain: 'string', skills: 'string', techStack: 'strings', outsideAcademics: 'string',
  whyAndropedia: 'string', oneYearVision: 'string',
  workUrl: 'string', portfolioUrl: 'string', achievements: 'achievements', photoId: 'string', photoUrl: 'string',
  hoursPerWeek: 'number', responsibility: 'number', inOtherClub: 'boolean', otherClubs: 'string', clubShouldProvide: 'string',
  rememberUs: 'string',
};

const isString = (v: unknown): v is string => typeof v === 'string';
const KIND_CHECKS = {
  string: isString,
  number: (v: unknown) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v: unknown) => typeof v === 'boolean',
  strings: (v: unknown) => Array.isArray(v) && v.every(isString),
  achievements: (v: unknown) =>
    Array.isArray(v) && v.every((a) => typeof a === 'object' && a !== null && isString(a.title) && isString(a.description)),
};

/** Keeps known keys with the right type and drops everything else, so a tampered or stale draft can't crash a step. */
export function sanitizeDraft(value: unknown): DraftData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, kind] of Object.entries(DRAFT_FIELDS)) {
    const v = (value as Record<string, unknown>)[key];
    if (v !== undefined && KIND_CHECKS[kind](v)) out[key] = v;
  }
  return out as DraftData;
}

const isEmpty = (data: DraftData) => Object.keys(data).length === 0;

export function readDraft(): DraftData {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? sanitizeDraft(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function writeDraft(data: DraftData): void {
  try {
    if (isEmpty(data)) window.localStorage.removeItem(DRAFT_KEY);
    else window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // Storage full, blocked or private mode: keep working in memory.
  }
}

export function removeDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // As above.
  }
}

type Patch = DraftData | ((prev: DraftData) => DraftData);

export type DraftContextValue = {
  data: DraftData;
  /** Merges the patch into the draft and schedules an autosave. */
  setData: (patch: Patch) => void;
  /** Re-reads the stored draft. Returns true when one was found. */
  restoreDraft: () => boolean;
  /** Empties the draft in memory and in storage. Used by Start over and after a successful submit. */
  clearDraft: () => void;
  /** True when this session started from a stored draft. */
  isDraft: boolean;
  /** The restored-draft banner shows on the first application view only. */
  draftNoticeOpen: boolean;
  closeDraftNotice: () => void;
  /** Kept in memory only (CLAUDE.md: browser storage is for the draft). Guards /apply/done (SHL-05). */
  submissionId: string | undefined;
  setSubmissionId: (id: string | undefined) => void;
  /** DONE-04 sign-off: the first name, kept after the draft is cleared on submit. Memory only. */
  submittedFirstName: string | undefined;
  setSubmittedFirstName: (name: string | undefined) => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readDraft);
  const [data, setState] = useState<DraftData>(initial);
  const [isDraft, setIsDraft] = useState(() => !isEmpty(initial));
  const [draftNoticeOpen, setDraftNoticeOpen] = useState(isDraft);
  const [submissionId, setSubmissionId] = useState<string>();
  const [submittedFirstName, setSubmittedFirstName] = useState<string>();

  // The latest unsaved value. Written after the debounce, on pagehide and on unmount, so a quick refresh loses nothing.
  const pending = useRef<DraftData | null>(null);
  const flush = useCallback(() => {
    if (pending.current) writeDraft(pending.current);
    pending.current = null;
  }, []);

  const changed = useRef(false);
  useEffect(() => {
    if (!changed.current) return;
    pending.current = data;
    const timer = window.setTimeout(flush, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [data, flush]);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const setData = useCallback((patch: Patch) => {
    changed.current = true;
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  const restoreDraft = useCallback(() => {
    const stored = readDraft();
    pending.current = null;
    changed.current = false;
    setState(stored);
    setIsDraft(!isEmpty(stored));
    return !isEmpty(stored);
  }, []);

  const clearDraft = useCallback(() => {
    pending.current = null;
    changed.current = false;
    removeDraft();
    setState({});
    setIsDraft(false);
    setDraftNoticeOpen(false);
  }, []);

  const closeDraftNotice = useCallback(() => setDraftNoticeOpen(false), []);

  const value = useMemo<DraftContextValue>(
    () => ({
      data,
      setData,
      restoreDraft,
      clearDraft,
      isDraft,
      draftNoticeOpen,
      closeDraftNotice,
      submissionId,
      setSubmissionId,
      submittedFirstName,
      setSubmittedFirstName,
    }),
    [data, setData, restoreDraft, clearDraft, isDraft, draftNoticeOpen, closeDraftNotice, submissionId, submittedFirstName],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useDraft must be used inside <DraftProvider>');
  return value;
}
