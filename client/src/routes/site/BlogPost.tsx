// Club website: one blog post at /blog/:slug. An unknown slug gets a not-found band inside the site frame.
import { marked } from 'marked';
import { Link, useParams } from 'react-router-dom';
import { SITE_PATHS, copy, fmt } from '@andropedia/shared';
import { PageIntro } from '../../components/PageIntro';
import { ArrowIcon } from '../../icons/ui';
import { POSTS, postDate } from '../../lib/blog';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

export default function BlogPost() {
  const { slug } = useParams();
  const post = POSTS.find((p) => p.slug === slug);
  useDocumentTitle(fmt(copy.site.docTitle, { page: post?.title ?? copy.site.blog.title }));
  if (!post) {
    return (
      <PageIntro title={copy.modal.title} intro={copy.notfound.body} tone="red">
        <Link to={SITE_PATHS.blog} className="mt-8 inline-flex min-h-[44px] items-center gap-2 font-semibold underline decoration-2 underline-offset-4">
          <ArrowIcon className="h-5 w-5 rotate-180" />
          {copy.site.blog.back}
        </Link>
      </PageIntro>
    );
  }

  // Trusted: posts are files in the repo, written by the club (lib/blog.ts).
  const html = marked.parse(post.body, { async: false });
  return (
    <article>
      <header className="bg-yellow text-ink [--focus:var(--ink)]">
        <div className="gutter mx-auto w-full max-w-[720px] pb-16 pt-8 md:pb-24 md:pt-12">
          <Link
            to={SITE_PATHS.blog}
            className="inline-flex min-h-[44px] items-center gap-2 font-semibold underline decoration-2 underline-offset-4"
          >
            <ArrowIcon className="h-5 w-5 rotate-180" />
            {copy.site.blog.back}
          </Link>
          <h1 className="mt-6 font-display text-[clamp(2.25rem,9vw,4rem)] leading-[0.95] tracking-[-0.02em]">{post.title}</h1>
          <p className="mt-4 font-semibold uppercase tracking-[0.04em]">
            <time dateTime={post.date}>{postDate(post.date)}</time>
            {post.author && <> · {fmt(copy.site.blog.by, { author: post.author })}</>}
          </p>
        </div>
      </header>
      <div className="band band-alt bg-paper text-ink">
        <div
          className="post-body gutter mx-auto w-full max-w-[720px] pb-20 pt-12 text-lg"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
