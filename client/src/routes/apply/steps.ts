// PRD section 3: six form routes in five progress stages, then /apply/done.
import {
  PROGRESS_STAGES,
  aboutSchema,
  copy,
  domainSchema,
  lastSchema,
  usSchema,
  workSchema,
  youSchema,
} from '@andropedia/shared';
import type { ZodTypeAny } from 'zod';
import type { DraftData } from '../../state/draft';

export const DONE_PATH = '/apply/done';

const DEFS = [
  { id: 'you', schema: youSchema, title: copy.you.title },
  { id: 'domain', schema: domainSchema, title: copy.domain.title },
  { id: 'about', schema: aboutSchema, title: copy.about.stepTitle },
  { id: 'work', schema: workSchema, title: copy.work.title },
  { id: 'us', schema: usSchema, title: copy.us.title },
  { id: 'last', schema: lastSchema, title: copy.last.title },
] as const;

export type StepId = (typeof DEFS)[number]['id'];

export type Step = {
  id: StepId;
  /** 0 based position in the flow. */
  index: number;
  /** Two digit step number used in the document title (SHL-06), e.g. "03". */
  n: string;
  path: string;
  /** Index into PROGRESS_STAGES. */
  stage: number;
  schema: ZodTypeAny;
  title: string;
};

export const STEPS: readonly Step[] = DEFS.map((def, index) => {
  const path = `/apply/${def.id}`;
  const stage = PROGRESS_STAGES.findIndex((s) => (s.routes as readonly string[]).includes(path));
  if (stage === -1) throw new Error(`No progress stage lists ${path}`);
  return { ...def, index, n: String(index + 1).padStart(2, '0'), path, stage };
});

export function stepById(id: StepId): Step {
  return STEPS.find((s) => s.id === id)!;
}

export const stepByPath = (pathname: string) => STEPS.find((s) => s.path === pathname);

/** Where Back goes: the previous step, or the landing page from step 01 (SHL-02). */
export const prevPath = (step: Step) => STEPS[step.index - 1]?.path ?? '/';
export const nextPath = (step: Step) => STEPS[step.index + 1]?.path ?? DONE_PATH;

/** Index of the first step whose schema fails on the draft, or STEPS.length when all pass. */
export function firstInvalidStep(data: DraftData): number {
  const i = STEPS.findIndex((s) => !s.schema.safeParse(data).success);
  return i === -1 ? STEPS.length : i;
}

/** LND-07: where a returning applicant picks up, the first incomplete step (step 06 if all pass). */
export const resumePath = (data: DraftData) => STEPS[Math.min(firstInvalidStep(data), STEPS.length - 1)]!.path;

export type StageState = 'locked' | 'current' | 'completed';

/**
 * SHL-01 stage states for a route. Earlier stages are completed (the guard guarantees it); later ones are
 * completed when every step up to them is valid, so a user who went back can jump forward again.
 * Stage 05 only completes on the success screen, since finishing it means submitting.
 */
export function progressFor(pathname: string, data: DraftData, submitted: boolean) {
  const done = pathname === DONE_PATH && submitted;
  const firstInvalid = firstInvalidStep(data);
  const stepDone = (s: Step) => done || s.index < firstInvalid;
  const current = done ? -1 : (stepByPath(pathname)?.stage ?? -1);
  const last = PROGRESS_STAGES.length - 1;

  const states = PROGRESS_STAGES.map((_, k): StageState => {
    if (done) return 'completed';
    if (k === current) return 'current';
    if (k === last) return 'locked';
    return STEPS.filter((s) => s.stage === k).every(stepDone) ? 'completed' : 'locked';
  });

  // Stage 02 ticks: part a (domain) and part b (about).
  const parts = STEPS.filter((s) => s.stage === 1).map(stepDone);
  return { states, parts };
}
