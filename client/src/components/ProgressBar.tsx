// SHL-01: five-stage progress game. DSN-08: a completed stage's check stamp lands with a small rotation,
// then the next number pops into the current state. Reduced motion: the stamp fades, nothing moves.
import { Link } from 'react-router-dom';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { PROGRESS_STAGES, copy } from '@andropedia/shared';
import { CheckIcon } from '../icons/ui';
import type { StageState } from '../routes/apply/steps';

// Stage colors are DOMAINS tokens in flow order; 05 Done is green, the success color (DSN-03).
const STAGE_FILL = ['bg-cobalt text-paper', 'bg-red text-ink', 'bg-yellow text-ink', 'bg-orange text-ink', 'bg-green text-paper'] as const;

// Locked: the outline is ink at 30% (SHL-01); the number uses --muted so the text still meets AA (DSN-03).
const BOX_STATE: Record<StageState, string> = {
  locked: 'border-ink-30 bg-paper text-muted',
  current: 'border-ink',
  completed: 'border-ink bg-ink text-paper',
};

const EASE = [0.2, 0.8, 0.2, 1] as const;
const STAMP_SECONDS = 0.35;
const POP_SCALE = 1.15;

type ProgressBarProps = {
  states: readonly StageState[];
  /** Stage 02 ticks: part a (domain) and part b (about) done. */
  parts: readonly boolean[];
  /** Success screen (DONE-01, DSN-08): every stage's stamp lands again, one after another, once. */
  celebrate?: boolean;
};

const CELEBRATE_STAGGER_SECONDS = 0.12;

export function ProgressBar({ states, parts, celebrate = false }: ProgressBarProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <LazyMotion features={domAnimation} strict>
      <nav aria-label={copy.progress.label}>
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
          {PROGRESS_STAGES.map((stage, k) => {
            const state = states[k] ?? 'locked';
            const suffix = state === 'completed' ? copy.progress.completed : state === 'locked' ? copy.progress.locked : '';
            const fill = state === 'current' ? STAGE_FILL[k] : '';

            const body = (
              <>
                <span className="sr-only">{`${stage.n} ${stage.label}${suffix ? `, ${suffix}` : ''}`}</span>
                <span aria-hidden="true" className="block">
                  <span
                    data-state={state}
                    className={`relative flex h-14 flex-col items-center justify-center gap-1 rounded-sm border-2 transition-colors duration-150 motion-reduce:transition-none ${BOX_STATE[state]} ${fill}`}
                  >
                    <m.span
                      className="block font-display text-[1.625rem] leading-none tracking-[-0.02em]"
                      initial={false}
                      animate={{ scale: state === 'current' ? POP_SCALE : 1 }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : state === 'current'
                            ? { type: 'spring', stiffness: 520, damping: 13, delay: STAMP_SECONDS }
                            : { duration: 0.15, ease: EASE }
                      }
                    >
                      {stage.n}
                    </m.span>
                    {k === 1 && (
                      <span className="flex gap-1">
                        {parts.map((done, i) => (
                          <span key={i} data-tick={done ? 'done' : 'todo'} className={`block h-1 w-3 border border-current ${done ? 'bg-current' : ''}`} />
                        ))}
                      </span>
                    )}
                    <AnimatePresence initial={false}>
                      {state === 'completed' && (
                        <m.span
                          // A new key on the success screen remounts the stamp, so all five land in sequence.
                          key={celebrate ? 'stamp-done' : 'stamp'}
                          data-stamp
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-sm border-2 border-ink bg-yellow text-ink"
                          initial={reduce ? { opacity: 0, rotate: -8 } : { opacity: 0, scale: 2, rotate: -32 }}
                          animate={{ opacity: 1, scale: 1, rotate: -8 }}
                          exit={{ opacity: 0, transition: { duration: 0.15 } }}
                          transition={{
                            duration: reduce ? 0.15 : STAMP_SECONDS,
                            ease: EASE,
                            delay: celebrate && !reduce ? k * CELEBRATE_STAGGER_SECONDS : 0,
                          }}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </m.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="mt-1.5 block text-center text-xs font-semibold uppercase tracking-[0.04em]">
                    {stage.label}
                  </span>
                </span>
              </>
            );

            return (
              <li key={stage.n} className="min-w-0">
                {state === 'completed' ? (
                  // Completed stages are the only tappable ones (SHL-05). Press shifts like a Button.
                  <Link
                    to={stage.routes[0]}
                    className="block rounded-sm transition-transform duration-150 active:translate-x-[2px] active:translate-y-[2px] motion-reduce:transition-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0"
                  >
                    {body}
                  </Link>
                ) : (
                  <div aria-current={state === 'current' ? 'step' : undefined}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </LazyMotion>
  );
}
