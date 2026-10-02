// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { copy } from '@andropedia/shared';
import NotFound from './NotFound';

describe('NotFound (DSN-11)', () => {
  it('shows notfound.body and a button back to /, with no form elements', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/nope']}>
        <Routes>
          <Route path="/" element={<p>home</p>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: copy.notfound.body })).toBeTruthy();
    expect(document.querySelector('form, input, select, textarea')).toBeNull();

    const home = screen.getByRole('link', { name: copy.nav.back });
    expect(home.getAttribute('href')).toBe('/');
    await user.click(home);
    expect(screen.getByText('home')).toBeTruthy();
  });
});
