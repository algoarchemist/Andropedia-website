// Renders the apply routes at `path` with a stored draft, plus a probe that shows the current pathname.
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DRAFT_KEY } from '@andropedia/shared';
import ApplyRoutes from '../routes/apply/ApplyRoutes';
import { DraftProvider, type DraftData } from '../state/draft';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

export function renderApply(path: string, draft: DraftData = {}) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DraftProvider>
        <Routes>
          <Route
            path="/apply/*"
            element={
              <>
                <ApplyRoutes />
                <Where />
              </>
            }
          />
          <Route path="/" element={<Where />} />
        </Routes>
      </DraftProvider>
    </MemoryRouter>,
  );
}

export const where = () => screen.getByTestId('where').textContent;

export const storedDraft = () => JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}') as DraftData;
