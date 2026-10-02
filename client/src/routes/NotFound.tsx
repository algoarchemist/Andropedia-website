// DSN-11: 404 page, expressive mode.
import { Link } from 'react-router-dom';
import { copy } from '@andropedia/shared';
import { buttonClass } from '../components/Button';

export default function NotFound() {
  return (
    <main className="gutter mx-auto flex min-h-dvh w-full max-w-[720px] flex-col justify-center py-12">
      <p aria-hidden="true" className="font-display text-[clamp(3rem,14vw,7rem)] leading-[0.9] tracking-[-0.02em]">
        {copy.modal.title}
      </p>
      <h1 className="mt-6 max-w-[28ch] font-display text-[clamp(1.5rem,6vw,2.25rem)] leading-tight">{copy.notfound.body}</h1>
      <Link to="/" className={buttonClass('primary', 'mt-8 w-full sm:w-auto sm:self-start')}>
        {copy.nav.back}
      </Link>
    </main>
  );
}
