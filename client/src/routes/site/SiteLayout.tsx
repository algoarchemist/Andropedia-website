// Club website frame: skip link, header with the ribbon, the page, the footer. The /apply/* steps sit outside it.
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { copy } from '@andropedia/shared';
import { SiteHeader } from '../../components/SiteHeader';
import { Footer } from '../landing/Footer';

export const MAIN_ID = 'main';

export default function SiteLayout() {
  return (
    // overflow-x: clip, so tilted rows and tapes never create a horizontal scrollbar.
    <div className="overflow-x-clip">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only z-50 bg-yellow px-4 py-3 font-semibold text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        {copy.site.skip}
      </a>
      <SiteHeader />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
