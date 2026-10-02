// LND-09 (P2): Instagram and contact links. Content is TODO_CONTENT until the club owner provides it.
import { copy } from '@andropedia/shared';

export function Footer() {
  return (
    <footer className="border-t-2 border-ink">
      <div className="gutter mx-auto w-full max-w-[720px] py-8">
        <p className="text-muted">{copy.footer.body}</p>
      </div>
    </footer>
  );
}
