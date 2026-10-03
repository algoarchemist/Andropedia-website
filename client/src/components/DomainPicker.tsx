// DSN-07 DomainPicker (APP-02-R2): a custom inline dropdown. Open, it expands in the flow and pushes content down
// (no floating overlay on mobile). Select only combobox pattern: focus stays on the trigger and the active row is
// announced through aria-activedescendant. Arrow keys, Home/End, Enter/Space, Esc and typeahead are supported.
// DSN-08: hover or press floods the row with its domain color from the left and plays the icon animation.
import { useEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import { DOMAINS, copy, type DomainId } from '@andropedia/shared';
import { DomainIcon } from '../icons/domains';
import { CheckIcon, ChevronIcon } from '../icons/ui';
import { DARK, DOMAIN_FILL } from '../routes/landing/Domains';
import { CONTROL_CLASS, Field, type FieldControlProps } from './Field';

type Domain = (typeof DOMAINS)[number];

// DSN-05: fixed per index, never random per render. Degrees, within +-0.5.
const TILT = [-0.5, 0.4, -0.3, 0.5, -0.4, 0.3];
const TYPEAHEAD_RESET_MS = 700;

type DomainPickerProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: DomainId) => void;
  /** Domains that cannot be picked here (Preference 2 removes Preference 1's value). */
  exclude?: string[];
  /** Shown under the field in place of a schema error (APP-02-R1). */
  error?: string;
};

export function DomainPicker({ name, label, value, onChange, exclude = [], error }: DomainPickerProps) {
  return (
    <Field name={name} label={label} error={error} stamp={false}>
      {({ labelId, ...control }) => (
        <Picker control={control} labelId={labelId} value={value} onChange={onChange} exclude={exclude} />
      )}
    </Field>
  );
}

type PickerProps = {
  control: FieldControlProps;
  labelId: string;
  value: string;
  onChange: (value: DomainId) => void;
  exclude: string[];
};

function Picker({ control, labelId, value, onChange, exclude }: PickerProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const valueId = `${uid}-value`;
  const optionId = (id: string) => `${uid}-opt-${id}`;

  const options = DOMAINS.filter((d) => !exclude.includes(d.id));
  const selected = DOMAINS.find((d) => d.id === value);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>();
  const [fresh, setFresh] = useState(false);
  const typed = useRef({ text: '', timer: 0 });
  useEffect(() => () => window.clearTimeout(typed.current.timer), []);

  const openList = (activeId?: string) => {
    setActive(activeId ?? (options.some((o) => o.id === value) ? value : options[0]?.id));
    setOpen(true);
  };
  const close = () => setOpen(false);

  const pick = (domain: Domain) => {
    setFresh(domain.id !== value);
    onChange(domain.id);
    close();
  };

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === active),
  );
  const move = (to: number) => setActive(options[Math.min(Math.max(to, 0), options.length - 1)]?.id);
  const pickActive = () => {
    const domain = options[activeIndex];
    if (domain) pick(domain);
  };

  function typeahead(key: string) {
    window.clearTimeout(typed.current.timer);
    typed.current.text += key.toLowerCase();
    typed.current.timer = window.setTimeout(() => (typed.current.text = ''), TYPEAHEAD_RESET_MS);
    const hit = options.find((o) => o.name.toLowerCase().startsWith(typed.current.text));
    if (!hit) return;
    if (!open) openList(hit.id);
    else setActive(hit.id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openList();
        else move(activeIndex + (e.key === 'ArrowDown' ? 1 : -1));
        return;
      case 'Home':
      case 'End':
        if (!open) return;
        e.preventDefault();
        move(e.key === 'Home' ? 0 : options.length - 1);
        return;
      case 'Escape':
        if (!open) return;
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      case 'Enter':
        // Enter on the trigger never submits the form (Next does that).
        e.preventDefault();
        if (open) pickActive();
        else openList();
        return;
      case ' ':
        e.preventDefault();
        if (typed.current.text) typeahead(' ');
        else if (open) pickActive();
        else openList();
        return;
      case 'Tab':
        close();
        return;
      default:
        if (e.key.length === 1) {
          e.preventDefault();
          typeahead(e.key);
        }
    }
  }

  // Focus leaving the picker closes it. Rows cancel mousedown so focus stays on the trigger;
  // this therefore only fires for a real move away.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
  };

  return (
    <div onBlur={onBlur}>
      <button
        {...control}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active ? optionId(active) : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`${CONTROL_CLASS} flex min-h-[64px] items-center gap-3 py-2 text-left`}
      >
        <span id={valueId} className="flex min-w-0 flex-1 items-center gap-3">
          {selected ? (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink ${DOMAIN_FILL[selected.color]} ${
                  DARK.has(selected.color) ? 'text-paper' : 'text-ink'
                }`}
              >
                <DomainIcon name={selected.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{selected.name}</span>
                <span className="block text-sm leading-snug text-muted">{selected.tagline}</span>
              </span>
            </>
          ) : (
            <span className="text-muted">{copy.domain.prompt}</span>
          )}
        </span>
        {selected && (
          <span
            key={selected.id}
            data-fresh={fresh}
            aria-hidden="true"
            className="pick-stamp flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink bg-ink text-paper"
          >
            <CheckIcon className="h-4 w-4" />
          </span>
        )}
        <ChevronIcon
          className={`h-5 w-5 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul id={listId} role="listbox" aria-labelledby={labelId} className="mt-3 space-y-2">
          {options.map((domain) => (
            <Row
              key={domain.id}
              id={optionId(domain.id)}
              domain={domain}
              tilt={TILT[DOMAINS.indexOf(domain) % TILT.length]!}
              selected={domain.id === value}
              active={domain.id === active}
              onPick={() => pick(domain)}
              onHover={() => setActive(domain.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type RowProps = {
  id: string;
  domain: Domain;
  tilt: number;
  selected: boolean;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
};

function Row({ id, domain, tilt, selected, active, onPick, onHover }: RowProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const engaged = hovered || pressed || active;
  const style = { '--flood': `var(--${domain.color})`, transform: `rotate(${tilt}deg)` } as CSSProperties;

  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      data-engaged={engaged}
      data-tone={DARK.has(domain.color) ? 'dark' : 'light'}
      style={style}
      className="domain-row flex min-h-[64px] cursor-pointer items-center gap-3 rounded-sm border-2 border-ink bg-paper px-3 py-2"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') {
          setHovered(true);
          onHover();
        }
      }}
      onPointerLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <DomainIcon name={domain.icon} playing={engaged} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight">{domain.name}</span>
        <span className="block text-sm leading-snug">{domain.tagline}</span>
      </span>
      {selected && <CheckIcon className="h-5 w-5 shrink-0" />}
    </li>
  );
}
