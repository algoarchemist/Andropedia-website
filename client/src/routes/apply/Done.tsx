// Success screen (DONE). Only reachable with a submission id from this session (SHL-05). The shell's progress
// bar shows every stage completed, and the stamps land in sequence once (DONE-01, DSN-08).
import { useEffect } from 'react';
import { INSTAGRAM_URL, PROGRESS_STAGES, copy, fmt } from '@andropedia/shared';
import { StageNumeral } from '../../components/StageNumeral';
import { InstagramIcon, WhatsAppIcon } from '../../icons/ui';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useConfig } from '../../state/config';
import { useDraft } from '../../state/draft';

const BOX = 'flex w-full items-center justify-center gap-3 px-5 text-center font-display text-xl uppercase leading-tight sm:text-2xl';
const PRESS =
  'transition-transform duration-150 active:translate-x-[2px] active:translate-y-[2px] motion-reduce:transition-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0';

/** Instagram's warm colors as flat bands along the top of its box: no gradient, and only the warm end of its palette (DSN-06). */
const INSTA_BANDS = ['bg-yellow', 'bg-orange', 'bg-red', 'bg-insta'] as const;

export default function Done() {
  useDocumentTitle(copy.shell.doneTitle);
  // A block body: Chrome's scrollTo now returns a Promise, and React would call a returned value as the clean-up.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const config = useConfig();
  const { submittedFirstName } = useDraft();
  const whatsappUrl = config?.whatsappUrl;

  return (
    <>
      <div className="step-head on-band">
        <h1 className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[0.95] tracking-[-0.02em]">{copy.done.title}</h1>
        <p className="mt-4 text-lg">{copy.done.body}</p>
        <StageNumeral n={PROGRESS_STAGES[PROGRESS_STAGES.length - 1]!.n} />
      </div>

      {/* DONE-03: full width, at least 72px, display type, flat green. Its height is reserved while config loads.
          Until the community link is final (empty WHATSAPP_COMMUNITY_URL) the same box is a plain placeholder. */}
      <div className="mt-10 min-h-[72px]">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BOX} ${PRESS} min-h-[72px] rounded-sm border-2 border-ink bg-green py-4 text-paper`}
          >
            <WhatsAppIcon className="h-8 w-8 shrink-0" />
            <span>{copy.done.whatsapp}</span>
          </a>
        ) : (
          config && (
            <p data-testid="whatsapp-soon" className={`${BOX} min-h-[72px] rounded-sm border-2 border-ink bg-green py-4 text-paper`}>
              <WhatsAppIcon className="h-8 w-8 shrink-0" />
              <span>{copy.done.whatsappSoon}</span>
            </p>
          )
        )}
      </div>

      {/* LND-09 on the success screen: the club's Instagram, in flat Instagram colors. */}
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${PRESS} mt-4 block overflow-hidden rounded-sm border-2 border-ink bg-insta text-paper`}
      >
        <span aria-hidden="true" className="flex h-2">
          {INSTA_BANDS.map((band) => (
            <span key={band} className={`flex-1 ${band}`} />
          ))}
        </span>
        <span className={`${BOX} min-h-[64px] py-3`}>
          <InstagramIcon className="h-7 w-7 shrink-0" />
          <span>{copy.done.instagram}</span>
        </span>
      </a>

      {/* DONE-04 (P2): a short sign-off with the applicant's first name. */}
      {submittedFirstName && (
        <p className="mt-10 inline-block -rotate-1 font-display text-2xl">{fmt(copy.done.signoff, { firstName: submittedFirstName })}</p>
      )}
    </>
  );
}
