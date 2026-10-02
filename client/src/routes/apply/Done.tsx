// Success screen shell. Only reachable with a submission id from this session (SHL-05).
// The WhatsApp button, sign-off and stage sequence arrive in Phase 7.
import { useEffect } from 'react';
import { copy } from '@andropedia/shared';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

export default function Done() {
  useDocumentTitle(copy.shell.doneTitle);
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <>
      <h1 className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-[0.95] tracking-[-0.02em]">{copy.done.title}</h1>
      <p className="mt-4 text-lg">{copy.done.body}</p>
    </>
  );
}
