// LND-09 (P2): Instagram and contact links. The Instagram and LinkedIn logos link to the club's profiles; the contact
// text is TODO_CONTENT until the club owner provides it.
import type { ComponentType } from 'react';
import { INSTAGRAM_URL, LINKEDIN_URL, copy } from '@andropedia/shared';
import { InstagramIcon, LinkedInIcon } from '../../icons/ui';

const SOCIAL: { href: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { href: INSTAGRAM_URL, label: copy.footer.instagram, Icon: InstagramIcon },
  { href: LINKEDIN_URL, label: copy.footer.linkedin, Icon: LinkedInIcon },
];

export function Footer() {
  return (
    <footer className="band band-alt bg-ink text-paper [--focus:var(--paper)]">
      <div className="gutter mx-auto w-full max-w-[720px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        {/* 48px targets (DSN-10); the negative margin lines the first glyph up with the text below. */}
        <ul className="-ml-2.5 flex list-none gap-2 p-0">
          {SOCIAL.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-12 w-12 items-center justify-center rounded-sm text-paper transition-colors duration-150 hover:bg-yellow hover:text-ink motion-reduce:transition-none"
              >
                <Icon className="h-7 w-7" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4">{copy.footer.body}</p>
      </div>
    </footer>
  );
}
