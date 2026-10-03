// DSN-07 Slider: a native input[type=range] styled over, so it stays accessible and keyboard operable.
// Square 28px thumb, 6px ink track, a tick and label under every stop, the live value above the thumb.
// It starts unset (APP-05): ghost thumb, `us.sliderPrompt` shown, aria-valuetext "Not answered". The first
// interaction sets it, including a tap or key press that lands on the ghost's own position.
import type { KeyboardEvent, ReactNode } from 'react';
import { copy } from '@andropedia/shared';
import { Field } from './Field';

const THUMB_PX = 28;
const SET_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

type SliderProps = {
  name: string;
  label: ReactNode;
  min: number;
  max: number;
  value: number | undefined;
  onChange: (value: number) => void;
  /** Text under each stop, e.g. `7+` for the last hours stop. */
  tickLabel?: (n: number) => string;
  /** Readable value for screen readers, e.g. `4 out of 5`. */
  valueText: (n: number) => string;
  /** Words under the two ends (APP-05 F2: Not at all, Always). */
  endLabels?: [string, string];
};

/** Horizontal centre of stop `n`, matching where the browser draws the thumb. */
const at = (n: number, min: number, max: number) =>
  `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${(n - min) / (max - min)})`;

export function Slider({ name, label, min, max, value, onChange, tickLabel = String, valueText, endLabels }: SliderProps) {
  const unset = value === undefined;
  const stops = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const setFrom = (el: HTMLInputElement) => {
    if (unset) onChange(Number(el.value));
  };

  return (
    <Field name={name} label={label}>
      {({ labelId: _labelId, ...control }) => (
        <div className="relative pt-7">
          {/* Live value above the thumb, or the prompt while unanswered. */}
          {unset ? (
            <p aria-hidden="true" className="absolute left-0 top-0 text-sm font-semibold text-muted">
              {copy.us.sliderPrompt}
            </p>
          ) : (
            <p
              aria-hidden="true"
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-sm border-2 border-ink bg-yellow px-2 font-display text-base leading-6"
              style={{ left: at(value, min, max) }}
            >
              {tickLabel(value)}
            </p>
          )}
          <input
            {...control}
            type="range"
            min={min}
            max={max}
            step={1}
            value={value ?? min}
            data-unset={unset}
            aria-valuetext={unset ? copy.us.notAnswered : valueText(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            onPointerUp={(e) => setFrom(e.currentTarget)}
            onKeyUp={(e: KeyboardEvent<HTMLInputElement>) => {
              if (SET_KEYS.has(e.key)) setFrom(e.currentTarget);
            }}
            className="slider block w-full"
          />
          <div aria-hidden="true" className="relative h-8">
            {stops.map((n) => (
              <span
                key={n}
                className={`absolute top-0 flex -translate-x-1/2 flex-col items-center text-sm ${n === value ? 'font-semibold text-ink' : 'text-muted'}`}
                style={{ left: at(n, min, max) }}
              >
                <span className="block h-2 w-0.5 bg-ink" />
                <span className="leading-6">{tickLabel(n)}</span>
              </span>
            ))}
          </div>
          {endLabels && (
            <div aria-hidden="true" className="mt-1 flex justify-between text-sm font-semibold">
              <span>{endLabels[0]}</span>
              <span>{endLabels[1]}</span>
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
