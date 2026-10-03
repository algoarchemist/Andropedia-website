// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LIMITS, copy, fmt } from '@andropedia/shared';
import { TagInput } from './TagInput';

function Harness({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial);
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <TagInput name="techStack" label={copy.about.stack} tags={tags} onChange={setTags} />
      <output data-testid="tags">{tags.join('|')}</output>
    </form>
  );
}

const tags = () => screen.getByTestId('tags').textContent;
const input = () => screen.getByLabelText(copy.about.stack);

// Field reads the draft and step schema, so it needs the providers it normally gets from a step.
import { MemoryRouter } from 'react-router-dom';
import { DraftProvider } from '../state/draft';
const renderTags = (initial?: string[]) =>
  render(
    <MemoryRouter>
      <DraftProvider>
        <Harness initial={initial} />
      </DraftProvider>
    </MemoryRouter>,
  );

describe('TagInput (APP-03 F4)', () => {
  it('adds a tag on Enter and on comma, and clears the input', async () => {
    const user = userEvent.setup();
    renderTags();
    await user.type(input(), 'React{Enter}');
    await user.type(input(), 'Python,');
    expect(tags()).toBe('React|Python');
    expect((input() as HTMLInputElement).value).toBe('');
  });

  it('splits a pasted list on commas', async () => {
    const user = userEvent.setup();
    renderTags();
    await user.click(input());
    await user.paste('Go, Rust, Zig');
    await user.keyboard('{Enter}');
    expect(tags()).toBe('Go|Rust|Zig');
  });

  it('ignores blanks and repeats', async () => {
    const user = userEvent.setup();
    renderTags(['React']);
    await user.type(input(), '   {Enter}');
    await user.type(input(), 'react{Enter}');
    expect(tags()).toBe('React');
  });

  it('Backspace on an empty input removes the last tag', async () => {
    const user = userEvent.setup();
    renderTags(['A', 'B']);
    await user.click(input());
    await user.keyboard('{Backspace}');
    expect(tags()).toBe('A');
    await user.type(input(), 'x{Backspace}');
    expect(tags()).toBe('A'); // Backspace on typed text only deletes the letter
  });

  it('caps a tag at its max length', () => {
    renderTags();
    expect(input().getAttribute('maxlength')).toBe(String(LIMITS.stackTagMaxLen));
  });

  it('stops at the tag limit and says so', async () => {
    const user = userEvent.setup();
    const full = Array.from({ length: LIMITS.stackTagsMax }, (_, i) => `t${i}`);
    renderTags(full);
    await user.type(input(), 'extra{Enter}');
    expect(tags()?.split('|')).toHaveLength(LIMITS.stackTagsMax);
    expect(screen.getByText(fmt(copy.about.stackFull, { max: String(LIMITS.stackTagsMax) }))).toBeTruthy();
  });

  it('removes a tag by click, and with Delete after arrowing to it', async () => {
    const user = userEvent.setup();
    renderTags(['A', 'B', 'C']);
    await user.click(screen.getByRole('button', { name: fmt(copy.about.stackRemove, { tag: 'B' }) }));
    expect(tags()).toBe('A|C');
    await user.click(input());
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement?.getAttribute('aria-label')).toBe(fmt(copy.about.stackRemove, { tag: 'C' }));
    await user.keyboard('{ArrowLeft}{Delete}');
    expect(tags()).toBe('C');
  });
});
