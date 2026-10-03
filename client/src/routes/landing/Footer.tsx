// LND-09 (P2): Instagram and contact links. The Instagram logo links to the club's profile; the contact text is
// TODO_CONTENT until the club owner provides it.
import { INSTAGRAM_URL, copy } from '@andropedia/shared';
import { InstagramIcon } from '../../icons/ui';

export function Footer() {
  return (
    <footer className="band bg-ink text-paper [--focus:var(--paper)]">
      <div className="gutter mx-auto w-full max-w-[720px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        {/* 48px target (DSN-10); the negative margin lines the glyph up with the text below. */}
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.footer.instagram}
          className="-ml-2.5 inline-flex h-12 w-12 items-center justify-center rounded-sm text-paper transition-colors duration-150 hover:bg-yellow hover:text-ink motion-reduce:transition-none"
        >
          <InstagramIcon className="h-7 w-7" />
        </a>
        <p className="mt-4">{copy.footer.body}</p>
      </div>
    </footer>
  );
}
