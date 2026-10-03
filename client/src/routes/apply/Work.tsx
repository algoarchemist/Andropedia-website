// Step 04, stage 03 (APP-04): a portfolio wall, not an upload form. Every field is a tile; tapping one opens a
// plain, straight editor in its place (APP-04-R2). Tiles: photo, work link, portfolio (optional), up to three
// achievements and an empty slot for the next one.
import { useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { LIMITS, copy } from '@andropedia/shared';
import { Button } from '../../components/Button';
import { CONTROL_CLASS, Field } from '../../components/Field';
import { PhotoTile } from '../../components/PhotoTile';
import { StepLayout } from '../../components/StepLayout';
import { TextField } from '../../components/TextField';
import { EmptyTile, LinkTile, ProudTile, Wall, WallSlot } from '../../components/WallTile';
import {
  ServerErrorsContext,
  draftValueAt,
  useLiveStepErrors,
  useStepErrors,
  type FieldErrors,
} from '../../hooks';
import { linkParts } from '../../lib/links';
import { useDraft, type DraftData } from '../../state/draft';
import { stepById } from './steps';

const step = stepById('work');

type Achievement = NonNullable<DraftData['achievements']>[number];
type Editing = { kind: 'workUrl' | 'portfolioUrl' } | { kind: 'proud'; index: number } | null;

/** First error at `path` or under it (`achievements.0` owns `achievements.0.title`). */
function errorUnder(errors: FieldErrors, path: string): string | undefined {
  return errors[path] ?? Object.entries(errors).find(([k]) => k.startsWith(`${path}.`))?.[1];
}

export default function Work() {
  return (
    <StepLayout step={step}>
      <WorkWall />
    </StepLayout>
  );
}

/** Inside StepLayout, so it can read the step errors and schema it provides. */
function WorkWall() {
  const { data, setData } = useDraft();
  const [editing, setEditing] = useState<Editing>(null);
  const submitted = useStepErrors();
  const live = useLiveStepErrors();
  const server = useContext(ServerErrorsContext);

  const achievements = data.achievements ?? [];
  const firstName = (data.name ?? '').trim().split(/\s+/)[0] ?? '';

  // Tiles filled during this visit drop onto the wall (DSN-08); ones restored from the draft are already pinned.
  const [initiallyFilled] = useState(
    () =>
      new Set([
      data.photoUrl && 'photoId',
      data.workUrl && 'workUrl',
      data.portfolioUrl && 'portfolioUrl',
        ...achievements.map((_, i) => `achievements.${i}`),
      ]),
  );
  const fresh = (key: string) => !initiallyFilled.has(key);

  // A tile shows a server error while its value is unchanged (APP-06-R2 400), else its schema error after a
  // failed Next, and only while it is still wrong.
  const serverError = (path: string) =>
    Object.entries(server).find(
      ([k, { value }]) => (k === path || k.startsWith(`${path}.`)) && draftValueAt(data, k) === value,
    )?.[1].message;
  const tileError = (path: string) =>
    serverError(path) ??
    (Object.keys(submitted).some((k) => k === path || k.startsWith(`${path}.`)) ? errorUnder(live, path) : undefined);

  // After an editor closes, focus returns to the tile it came from.
  const returnFocus = useRef<string | null>(null);
  useEffect(() => {
    if (editing || !returnFocus.current) return;
    const key = returnFocus.current;
    returnFocus.current = null;
    document.querySelector<HTMLElement>(`[data-field="${key}"] button`)?.focus();
  }, [editing]);

  const close = (key: string) => {
    returnFocus.current = key;
    setEditing(null);
  };

  function openProud(index: number) {
    if (index === achievements.length) setData({ achievements: [...achievements, { title: '', description: '' }] });
    setEditing({ kind: 'proud', index });
  }

  let index = 0;
  const tiles: ReactNode[] = [];

  tiles.push(
    <PhotoTile
      key="photo"
      index={index++}
      fresh={fresh('photoId')}
      error={tileError('photoId')}
      url={data.photoUrl || undefined}
      firstName={firstName}
      onUploaded={({ photoId, url }) => setData({ photoId, photoUrl: url })}
      onRemoved={() => setData({ photoId: '', photoUrl: '' })}
    />,
  );

  for (const kind of ['workUrl', 'portfolioUrl'] as const) {
    const i = index++;
    const label = kind === 'workUrl' ? copy.work.link : copy.work.portfolio;
    if (editing?.kind === kind) {
      tiles.push(
        <LinkEditor key={kind} name={kind} label={label} live={live} onDone={() => close(kind)} onRemove={() => {
          setData({ [kind]: '' });
          close(kind);
        }} />,
      );
      continue;
    }
    const link = data[kind] ? linkParts(data[kind]) : undefined;
    tiles.push(
      <WallSlot key={kind} index={i} field={kind} fresh={Boolean(link) && fresh(kind)} error={tileError(kind)}>
        {link ? (
          <LinkTile label={label} link={link} onOpen={() => setEditing({ kind })} />
        ) : (
          <EmptyTile
            prompt={kind === 'workUrl' ? copy.work.empty.link : copy.work.empty.portfolio}
            hint={label}
            onOpen={() => setEditing({ kind })}
          />
        )}
      </WallSlot>,
    );
  }

  achievements.forEach((item, n) => {
    const i = index++;
    const key = `achievements.${n}`;
    if (editing?.kind === 'proud' && editing.index === n) {
      tiles.push(
        <ProudEditor
          key={key}
          n={n}
          item={item}
          live={live}
          onChange={(next) => setData({ achievements: achievements.map((a, k) => (k === n ? next : a)) })}
          onDone={() => {
            // An entry left completely blank is dropped rather than kept as an invalid card.
            if (!item.title.trim() && !item.description.trim()) {
              setData({ achievements: achievements.filter((_, k) => k !== n) });
              close(n === 0 ? 'achievements' : `achievements.${n - 1}`);
            } else close(key);
          }}
          onRemove={() => {
            setData({ achievements: achievements.filter((_, k) => k !== n) });
            close(n === 0 ? 'achievements' : `achievements.${n - 1}`);
          }}
        />,
      );
      return;
    }
    tiles.push(
      <WallSlot key={key} index={i} field={key} fresh={fresh(key)} error={tileError(key)}>
        <ProudTile n={n + 1} title={item.title} description={item.description} onOpen={() => openProud(n)} />
      </WallSlot>,
    );
  });

  if (achievements.length < LIMITS.achievementsMax) {
    const i = index++;
    tiles.push(
      <WallSlot key="proud-empty" index={i} field="achievements" error={achievements.length ? undefined : tileError('achievements')}>
        <EmptyTile prompt={copy.work.empty.proud} hint={copy.work.proud} onOpen={() => openProud(achievements.length)} />
      </WallSlot>,
    );
  }

  return <Wall>{tiles}</Wall>;
}

/** Esc closes an editor the same way as its Pin it button. */
const escapeTo = (onDone: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    onDone();
  }
};

function EditorFrame({ onDone, onRemove, children }: { onDone: () => void; onRemove: () => void; children: ReactNode }) {
  return (
    // Spans the full row so inputs keep a usable width in the two column layout. Straight, never tilted (R2).
    <li className="min-[480px]:col-span-2 rounded-sm border-2 border-ink bg-paper p-4" onKeyDown={escapeTo(onDone)}>
      <div className="space-y-5">{children}</div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onDone} className="w-full sm:w-auto">
          {copy.work.save}
        </Button>
        <Button type="button" variant="secondary" onClick={onRemove} className="w-full sm:w-auto">
          {copy.work.remove}
        </Button>
      </div>
    </li>
  );
}

function LinkEditor({
  name,
  label,
  live,
  onDone,
  onRemove,
}: {
  name: 'workUrl' | 'portfolioUrl';
  label: string;
  live: FieldErrors;
  onDone: () => void;
  onRemove: () => void;
}) {
  const { data } = useDraft();
  const [checked, setChecked] = useState(false);
  const error = checked ? live[name] : undefined;

  const done = () => {
    // An empty link just closes (the tile goes back to its prompt); a wrong one stays open with its error.
    if (data[name]?.trim() && live[name]) setChecked(true);
    else onDone();
  };

  return (
    <EditorFrame onDone={done} onRemove={onRemove}>
      <TextField
        name={name}
        label={label}
        type="url"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        error={error}
      />
    </EditorFrame>
  );
}

function ProudEditor({
  n,
  item,
  live,
  onChange,
  onDone,
  onRemove,
}: {
  n: number;
  item: Achievement;
  live: FieldErrors;
  onChange: (item: Achievement) => void;
  onDone: () => void;
  onRemove: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const titlePath = `achievements.${n}.title`;
  const descPath = `achievements.${n}.description`;
  const blank = !item.title.trim() && !item.description.trim();

  const done = () => {
    if (!blank && (live[titlePath] || live[descPath])) setChecked(true);
    else onDone();
  };

  return (
    <EditorFrame onDone={done} onRemove={onRemove}>
      <p className="font-display text-lg leading-tight">{copy.work.proud}</p>
      <Field name={titlePath} label={copy.work.proudTitle} error={checked ? live[titlePath] : undefined}>
        {({ labelId: _labelId, ...control }) => (
          <input
            {...control}
            type="text"
            value={item.title}
            maxLength={LIMITS.achievementTitleMax}
            autoCapitalize="sentences"
            autoFocus
            onChange={(e) => onChange({ ...item, title: e.target.value })}
            className={CONTROL_CLASS}
          />
        )}
      </Field>
      <Field
        name={descPath}
        label={copy.work.proudDesc}
        error={checked ? live[descPath] : undefined}
        counter={{ length: item.description.length, max: LIMITS.achievementDescMax }}
      >
        {({ labelId: _labelId, ...control }) => (
          <textarea
            {...control}
            value={item.description}
            rows={4}
            maxLength={LIMITS.achievementDescMax}
            autoCapitalize="sentences"
            onChange={(e) => onChange({ ...item, description: e.target.value })}
            className={`${CONTROL_CLASS} min-h-[120px] resize-y leading-normal`}
          />
        )}
      </Field>
    </EditorFrame>
  );
}
