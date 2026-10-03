// DSN-07 TagInput (APP-03 F4): a text input plus square removable tags (radius 2px, never round).
// Enter or comma adds a tag; Backspace on an empty input removes the last one. ArrowLeft from the empty input
// walks back through the tags, Arrow keys move between them, Delete or Backspace removes the focused tag.
// Tags sit after the input in the DOM, so a failed Next focuses the input, not a remove button.
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { LIMITS, copy, fmt } from '@andropedia/shared';
import { CloseIcon } from '../icons/ui';
import { CONTROL_CLASS, Field } from './Field';

type TagInputProps = {
  name: string;
  label: string;
  helper?: ReactNode;
  tags: string[];
  onChange: (tags: string[]) => void;
};

export function TagInput({ name, label, helper, tags, onChange }: TagInputProps) {
  const [text, setText] = useState('');
  const [full, setFull] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tagRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Adds each non empty, new tag until the limit. Returns whether the limit stopped one. */
  function add(raw: string[]) {
    const next = [...tags];
    let hitLimit = false;
    for (const part of raw) {
      const tag = part.trim().slice(0, LIMITS.stackTagMaxLen);
      if (!tag || next.some((t) => t.toLowerCase() === tag.toLowerCase())) continue;
      if (next.length >= LIMITS.stackTagsMax) {
        hitLimit = true;
        break;
      }
      next.push(tag);
    }
    if (next.length !== tags.length) onChange(next);
    setFull(hitLimit);
  }

  function commit() {
    if (!text.trim()) return;
    add([text]);
    setText('');
  }

  function remove(index: number, focusAfter?: 'input' | number) {
    onChange(tags.filter((_, i) => i !== index));
    setFull(false);
    // Focus after the list re-renders.
    requestAnimationFrame(() => {
      if (focusAfter === 'input' || focusAfter === undefined) inputRef.current?.focus();
      else tagRefs.current[focusAfter]?.focus();
    });
  }

  function onInputChange(value: string) {
    if (!value.includes(',')) {
      setText(value);
      return;
    }
    // A comma commits everything before it (also for pasted lists like "React, Python"). The rest stays typed.
    const parts = value.split(',');
    const rest = parts.pop() ?? '';
    add(parts);
    setText(rest);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault(); // Enter adds a tag; Next submits the step.
      commit();
    } else if (e.key === 'Backspace' && !text && tags.length) {
      e.preventDefault();
      remove(tags.length - 1, 'input');
    } else if (e.key === 'ArrowLeft' && !text && tags.length) {
      e.preventDefault();
      tagRefs.current[tags.length - 1]?.focus();
    }
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        tagRefs.current[Math.max(index - 1, 0)]?.focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index === tags.length - 1) inputRef.current?.focus();
        else tagRefs.current[index + 1]?.focus();
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        // Land on the tag that slides into this spot, else the one before it, else the input.
        remove(index, index < tags.length - 1 ? index : index > 0 ? index - 1 : 'input');
        break;
    }
  }

  return (
    <Field name={name} label={label} helper={helper} error={full ? fmt(copy.about.stackFull, { max: String(LIMITS.stackTagsMax) }) : undefined}>
      {({ labelId: _labelId, ...control }) => (
        <>
          <input
            {...control}
            ref={inputRef}
            type="text"
            value={text}
            maxLength={LIMITS.stackTagMaxLen}
            autoComplete="off"
            autoCapitalize="none"
            enterKeyHint="enter"
            spellCheck={false}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            onBlur={commit}
            className={CONTROL_CLASS}
          />
          {tags.length > 0 && (
            <ul aria-label={copy.about.stackList} className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <li key={tag}>
                  <button
                    type="button"
                    ref={(el) => {
                      tagRefs.current[i] = el;
                    }}
                    tabIndex={-1}
                    aria-label={fmt(copy.about.stackRemove, { tag })}
                    onClick={() => remove(i, 'input')}
                    onKeyDown={(e) => onTagKeyDown(e, i)}
                    className="flex min-h-[44px] items-center gap-2 rounded-sm border-2 border-ink bg-yellow px-3 font-semibold"
                  >
                    <span className="break-all text-left">{tag}</span>
                    <CloseIcon className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Field>
  );
}
