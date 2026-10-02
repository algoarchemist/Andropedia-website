// PRD section 3: every /apply/* route renders inside the application shell (SHL-02).
// Loaded as its own chunk, so the landing page does not pay for it.
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from '../NotFound';
import About from './About';
import ApplyShell from './ApplyShell';
import Domain from './Domain';
import Done from './Done';
import Last from './Last';
import Us from './Us';
import Work from './Work';
import You from './You';

export default function ApplyRoutes() {
  return (
    <Routes>
      <Route element={<ApplyShell />}>
        <Route path="you" element={<You />} />
        <Route path="domain" element={<Domain />} />
        <Route path="about" element={<About />} />
        <Route path="work" element={<Work />} />
        <Route path="us" element={<Us />} />
        <Route path="last" element={<Last />} />
        <Route path="done" element={<Done />} />
      </Route>
      <Route index element={<Navigate to="you" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
