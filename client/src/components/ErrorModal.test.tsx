// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { copy } from '@andropedia/shared';
import { ErrorModal } from './ErrorModal';

/** A trigger that opens the modal, so focus return can be checked. */
function Harness({ onContinue = () => {} }: { onContinue?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        trigger
      </button>
      <button type="button">behind</button>
      {open && <ErrorModal onClose={() => setOpen(false)} onContinue={onContinue} />}
    </>
  );
}

async function openModal(onContinue?: () => void) {
  const user = userEvent.setup();
  render(<Harness onContinue={onContinue} />);
  const trigger = screen.getByRole('button', { name: 'trigger' });
  await user.click(trigger);
  return { user, trigger };
}

describe('ErrorModal (LND-07)', () => {
  it('is an alertdialog named by its title bar and described by its body', async () => {
    await openModal();
    const dialog = screen.getByRole('alertdialog', { name: copy.modal.title });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog).toHaveProperty('textContent', expect.stringContaining(copy.modal.body));
    const describedBy = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
    expect(describedBy?.textContent).toBe(copy.modal.body);
  });

  it('focuses the primary button on open', async () => {
    await openModal();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: copy.modal.continue }));
  });

  it('closes on Esc and returns focus to the trigger', async () => {
    const { user, trigger } = await openModal();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from the close icon and returns focus', async () => {
    const { user, trigger } = await openModal();
    await user.click(screen.getByRole('button', { name: copy.modal.close }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a backdrop press but not on a press inside the box', async () => {
    const { user } = await openModal();
    const dialog = screen.getByRole('alertdialog');
    await user.click(dialog);
    expect(screen.queryByRole('alertdialog')).not.toBeNull();
    await user.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    const { user } = await openModal();
    const close = screen.getByRole('button', { name: copy.modal.close });
    const go = screen.getByRole('button', { name: copy.modal.continue });

    await user.tab(); // from continue (last) wraps to close (first)
    expect(document.activeElement).toBe(close);
    await user.tab();
    expect(document.activeElement).toBe(go);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true }); // from close (first) wraps to continue (last)
    expect(document.activeElement).toBe(go);
  });

  it('pulls focus back in if it escaped to the page behind', async () => {
    const { user } = await openModal();
    screen.getByRole('button', { name: 'behind' }).focus();
    await user.tab();
    expect(screen.getByRole('alertdialog').contains(document.activeElement)).toBe(true);
  });

  it('calls onContinue from the primary button', async () => {
    const onContinue = vi.fn();
    const { user } = await openModal(onContinue);
    await user.click(screen.getByRole('button', { name: copy.modal.continue }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('locks page scroll while open and restores it on close', async () => {
    const { user } = await openModal();
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });
});
