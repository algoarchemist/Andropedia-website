// Club website Blog (docs/CLUB-SITE.md): every client/src/content/blog/<slug>.md becomes /blog/<slug>.
// Front matter between --- lines: title and date (YYYY-MM-DD) are required, author and excerpt are optional.
// Posts come from the repo (written by the club), so their Markdown is trusted.

export type Post = { slug: string; title: string; date: string; author?: string; excerpt?: string; body: string };

/** Parses one file; returns undefined (and the build keeps going) when the front matter is missing or incomplete. */
export function parsePost(slug: string, raw: string): Post | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return undefined;
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^["']|["']$/g, '');
  }
  const title = meta['title'];
  const date = meta['date'] ?? '';
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return {
    slug,
    title,
    date,
    author: meta['author'] || undefined,
    excerpt: meta['excerpt'] || undefined,
    body: match[2]!.trim(),
  };
}

/** Newest first. */
export function postsFrom(files: Record<string, string>): Post[] {
  return Object.entries(files)
    .map(([path, raw]) => parsePost(path.split('/').pop()!.replace(/\.md$/, ''), raw))
    .filter((post): post is Post => post !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const POSTS = postsFrom(
  import.meta.glob<string>('../content/blog/*.md', { query: '?raw', import: 'default', eager: true }),
);

/** "2026-10-03" as "3 Oct 2026". */
export const postDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
