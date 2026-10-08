// Club website header (docs/CLUB-SITE.md): the wordmark, then the navigation ribbon
// Home | Events | Our team | Projects | Blog | Androlink | Join us. On phones the ribbon scrolls sideways inside itself,
// never the page. NavLink marks the current page with aria-current="page".
import { Link, NavLink } from 'react-router-dom';
import { SITE_PATHS, copy } from '@andropedia/shared';

const NAV = [
  { to: SITE_PATHS.home, label: copy.site.nav.home, end: true },
  { to: SITE_PATHS.events, label: copy.site.nav.events },
  { to: SITE_PATHS.team, label: copy.site.nav.team },
  { to: SITE_PATHS.projects, label: copy.site.nav.projects },
  { to: SITE_PATHS.blog, label: copy.site.nav.blog },
  { to: SITE_PATHS.androlink, label: copy.site.nav.androlink },
] as const;

const ITEM =
  'flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-sm px-3 font-display text-sm uppercase leading-none tracking-[0.02em] transition-colors duration-150 motion-reduce:transition-none';

export function SiteHeader() {
  return (
    <header className="bg-ink text-paper [--focus:var(--paper)]">
      <div className="gutter mx-auto flex w-full max-w-screen-xl flex-col gap-2 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:flex-row md:items-center md:justify-between md:gap-6 md:pb-3">
        <Link to={SITE_PATHS.home} className="flex min-h-[44px] items-center gap-3 self-start">
          <span aria-hidden="true" className="block h-5 w-5 -rotate-6 border-2 border-paper bg-red" />
          <span className="font-display text-xl leading-none tracking-[-0.01em]">{copy.brand.name}</span>
        </Link>
        <nav aria-label={copy.site.navLabel} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <ul className="flex list-none items-center gap-1 p-0">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item}
                  className={({ isActive }) => `${ITEM} ${isActive ? 'bg-yellow text-ink' : 'hover:bg-paper hover:text-ink'}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li>
              {/* Join us is the accent: the way into the recruitment landing and the application. */}
              <NavLink
                to={SITE_PATHS.join}
                className={({ isActive }) =>
                  `${ITEM} ml-1 border-2 ${isActive ? 'border-yellow bg-yellow text-ink' : 'border-red bg-red text-ink hover:bg-paper'}`
                }
              >
                {copy.site.nav.join}
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
