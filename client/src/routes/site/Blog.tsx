// Club website Blog list (docs/CLUB-SITE.md): posts newest first, or the empty state.
import { Link } from 'react-router-dom';
import { SITE_PATHS, copy, fmt } from '@andropedia/shared';
import { PageIntro } from '../../components/PageIntro';
import { ArrowIcon } from '../../icons/ui';
import { POSTS, postDate } from '../../lib/blog';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

export default function Blog() {
  useDocumentTitle(fmt(copy.site.docTitle, { page: copy.site.blog.title }));
  return (
    <>
      <PageIntro title={copy.site.blog.title} intro={copy.site.blog.intro} tone="yellow" />
      <section aria-label={copy.site.blog.title} className="band band-alt bg-paper text-ink">
        <div className="gutter mx-auto w-full max-w-[720px] pb-20 pt-12 md:pb-28 md:pt-16">
          {POSTS.length === 0 ? (
            <p className="-rotate-1 rounded-sm border-2 border-dashed border-ink p-6 font-display text-[clamp(1.5rem,6vw,2.5rem)] leading-tight md:p-10">
              {copy.site.blog.empty}
            </p>
          ) : (
            <ul className="list-none space-y-4 p-0">
              {POSTS.map((post) => (
                <li key={post.slug} className="rounded-sm border-2 border-ink p-4 md:p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.04em]">
                    <time dateTime={post.date}>{postDate(post.date)}</time>
                    {post.author && <> · {fmt(copy.site.blog.by, { author: post.author })}</>}
                  </p>
                  <h2 className="mt-2 font-display text-2xl leading-tight md:text-3xl">
                    <Link to={`${SITE_PATHS.blog}/${post.slug}`} className="underline-offset-4 hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && <p className="mt-2">{post.excerpt}</p>}
                  {/* A second, larger target for the same post; screen readers get the title link only. */}
                  <Link
                    to={`${SITE_PATHS.blog}/${post.slug}`}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="mt-3 inline-flex min-h-[44px] items-center gap-2 font-semibold"
                  >
                    {copy.site.blog.read}
                    <ArrowIcon className="h-5 w-5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
