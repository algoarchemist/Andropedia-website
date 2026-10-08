// Landing page (LND-01 to LND-09). Expressive mode (DSN-02). On the club website it is Join us (`/join`): the site
// frame (routes/site/SiteLayout) supplies the header with the ribbon, the <main> and the footer.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JOIN_PATH, copy, fmt } from '@andropedia/shared';
import { ErrorModal } from '../components/ErrorModal';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDraft } from '../state/draft';
import { loadApplyRoutes } from './apply/preload';
import { resumePath } from './apply/steps';
import { About } from './landing/About';
import { ClosingCta } from './landing/ClosingCta';
import { Domains } from './landing/Domains';
import { Faq } from './landing/Faq';
import { Hero } from './landing/Hero';
import { Process } from './landing/Process';

export default function Landing() {
  const navigate = useNavigate();
  const { data } = useDraft();
  const [modalOpen, setModalOpen] = useState(false);
  useDocumentTitle(fmt(copy.site.docTitle, { page: copy.site.nav.join }));

  const openModal = () => {
    setModalOpen(true);
    // Fetch the application chunk while the modal is being read.
    void loadApplyRoutes().catch(() => {});
  };

  return (
    <>
      <Hero />
      <About />
      <Domains />
      <Process />
      <Faq />
      <ClosingCta onApply={openModal} />

      {/* LND-07: every Apply now opens the Error 404 modal. Continue goes to step 01, or with a saved draft to the first incomplete step (SHL-04). */}
      {modalOpen && (
        <ErrorModal
          onClose={() => setModalOpen(false)}
          onContinue={() => {
            setModalOpen(false);
            // `from` lets step 01's Back return through history (SHL-05).
            navigate(resumePath(data), { state: { from: JOIN_PATH } });
          }}
        />
      )}
    </>
  );
}
