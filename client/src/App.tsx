// PRD section 3 routes. The draft provider sits above every route so the draft and the
// in-memory submission id survive moving between the landing page and the steps.
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DraftProvider } from './state/draft';
import Landing from './routes/Landing';
import NotFound from './routes/NotFound';
import { loadApplyRoutes } from './routes/apply/preload';

const ApplyRoutes = lazy(loadApplyRoutes);

export default function App() {
  return (
    <BrowserRouter>
      <DraftProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/apply/*"
            element={
              <Suspense fallback={null}>
                <ApplyRoutes />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DraftProvider>
    </BrowserRouter>
  );
}
