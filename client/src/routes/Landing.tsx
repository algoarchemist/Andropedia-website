// Landing page (LND-01 to LND-09). Expressive mode (DSN-02).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { copy } from '@andropedia/shared';
import { ErrorModal } from '../components/ErrorModal';
import { About } from './landing/About';
import { ClosingCta } from './landing/ClosingCta';
import { Domains } from './landing/Domains';
import { Footer } from './landing/Footer';
import { Hero } from './landing/Hero';
import { Process } from './landing/Process';

export default function Landing() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  return (
    // overflow-x: clip, so rotated rows can never create a horizontal scrollbar.
    <div className="overflow-x-clip">
      {/* LND-01: wordmark only. The page has nothing to navigate between, so no menu. */}
      <header className="gutter mx-auto flex w-full max-w-screen-xl items-center gap-3 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span aria-hidden="true" className="block h-5 w-5 -rotate-6 border-2 border-ink bg-red" />
        <span className="font-display text-xl leading-none tracking-[-0.01em]">{copy.brand.name}</span>
      </header>

      <main>
        <Hero onApply={openModal} />
        <About />
        <Domains />
        <Process />
        <ClosingCta onApply={openModal} />
      </main>

      <Footer />

      {/* LND-07: every Apply now opens the Error 404 modal. Draft-aware resume arrives with the application shell (SHL-04). */}
      {modalOpen && (
        <ErrorModal
          onClose={() => setModalOpen(false)}
          onContinue={() => {
            setModalOpen(false);
            navigate('/apply/you');
          }}
        />
      )}
    </div>
  );
}
