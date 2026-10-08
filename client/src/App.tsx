// Routes. The club website (docs/CLUB-SITE.md) wraps every page except the /apply/* form steps and the 404 in the
// site frame (header with the ribbon, footer). The draft provider sits above every route so the draft and the
// in-memory submission id survive moving between Join us and the steps.
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SITE_PATHS } from '@andropedia/shared';
import { DraftProvider } from './state/draft';
import Landing from './routes/Landing';
import NotFound from './routes/NotFound';
import { loadApplyRoutes } from './routes/apply/preload';
import Home from './routes/site/Home';
import SiteLayout from './routes/site/SiteLayout';

const ApplyRoutes = lazy(loadApplyRoutes);
const Events = lazy(() => import('./routes/site/Events'));
const Team = lazy(() => import('./routes/site/Team'));
const Projects = lazy(() => import('./routes/site/Projects'));
const Blog = lazy(() => import('./routes/site/Blog'));
const BlogPost = lazy(() => import('./routes/site/BlogPost'));
const Androlink = lazy(() => import('./routes/site/Androlink'));

export default function App() {
  return (
    <BrowserRouter>
      <DraftProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path={SITE_PATHS.home} element={<Home />} />
            <Route path={SITE_PATHS.events} element={<Events />} />
            <Route path={SITE_PATHS.team} element={<Team />} />
            <Route path={SITE_PATHS.projects} element={<Projects />} />
            <Route path={SITE_PATHS.blog} element={<Blog />} />
            <Route path={`${SITE_PATHS.blog}/:slug`} element={<BlogPost />} />
            <Route path={SITE_PATHS.androlink} element={<Androlink />} />
            <Route path={SITE_PATHS.join} element={<Landing />} />
          </Route>
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
