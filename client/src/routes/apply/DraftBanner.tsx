// SHL-04: shown on the first application view after a draft is restored.
import { useState } from 'react';
import { copy } from '@andropedia/shared';
import { Dialog } from '../../components/Dialog';

export function DraftBanner({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-x-4 rounded-sm border-2 border-ink bg-yellow py-1 pl-4 pr-2">
      <p className="py-2 font-semibold">{copy.draft.restored}</p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-[44px] px-2 font-semibold underline decoration-2 underline-offset-4"
      >
        {copy.draft.reset}
      </button>

      {confirming && (
        <Dialog
          title={copy.draft.confirmTitle}
          body={copy.draft.confirmBody}
          primary={{ label: copy.draft.confirmYes, onClick: onReset }}
          secondary={{ label: copy.draft.confirmNo, onClick: () => setConfirming(false) }}
          initialFocus="secondary"
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
