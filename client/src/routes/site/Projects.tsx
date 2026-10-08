// Club website Projects (docs/CLUB-SITE.md). Data: shared/content/projects.ts, empty until the owner sends projects.
import { Link } from 'react-router-dom';
import { DOMAINS, PROJECTS, SITE_PATHS, copy, fmt } from '@andropedia/shared';
import { PageIntro } from '../../components/PageIntro';
import { ArrowIcon } from '../../icons/ui';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { DARK, DOMAIN_FILL } from '../landing/Domains';

const MORE_LINK = 'inline-flex min-h-[44px] items-center gap-2 font-semibold underline decoration-2 underline-offset-4';

export default function Projects() {
  useDocumentTitle(fmt(copy.site.docTitle, { page: copy.site.projects.title }));
  return (
    <>
      <PageIntro title={copy.site.projects.title} intro={copy.site.projects.intro} tone="pink" />
      <section aria-label={copy.site.projects.title} className="band band-alt bg-ink text-paper [--focus:var(--paper)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-20 pt-12 md:pb-28 md:pt-16">
          {PROJECTS.length === 0 ? (
            <div className="-rotate-1 rounded-sm border-2 border-dashed border-paper p-6 md:p-10">
              <p className="font-display text-[clamp(1.5rem,6vw,2.5rem)] leading-tight">{copy.site.projects.empty}</p>
              <Link to={SITE_PATHS.join} className={`mt-6 ${MORE_LINK}`}>
                {copy.site.projects.emptyCta}
                <ArrowIcon className="h-5 w-5" />
              </Link>
            </div>
          ) : (
            <ul className="list-none space-y-4 p-0">
              {PROJECTS.map((project, i) => {
                const domain = DOMAINS.find((d) => d.id === project.domain)!;
                return (
                  <li
                    key={project.id}
                    className={`rounded-sm border-2 border-ink bg-paper p-4 text-ink ${i % 2 ? 'ml-4 md:ml-12' : 'mr-4 md:mr-12'}`}
                  >
                    <span
                      className={`inline-block px-2 py-0.5 text-sm font-semibold ${DOMAIN_FILL[domain.color]} ${
                        DARK.has(domain.color) ? 'text-paper' : 'text-ink'
                      }`}
                    >
                      {domain.name}
                    </span>
                    <h2 className="mt-3 font-display text-2xl leading-tight">{project.name}</h2>
                    <p className="mt-2">{project.summary}</p>
                    {project.builtBy && project.builtBy.length > 0 && (
                      <p className="mt-2 text-sm font-semibold">{fmt(copy.site.projects.by, { names: project.builtBy.join(', ') })}</p>
                    )}
                    {project.link && (
                      <a href={project.link} target="_blank" rel="noopener noreferrer" className={`mt-3 ${MORE_LINK}`}>
                        {fmt(copy.site.projects.open, { name: project.name })}
                        <ArrowIcon className="h-5 w-5" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
