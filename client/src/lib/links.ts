// APP-04-R1: link tiles show a service glyph, the hostname and a shortened path.
export type LinkService = 'github' | 'drive' | 'linkedin' | 'link';

export type LinkParts = { service: LinkService; host: string; path: string };

const PATH_MAX = 24;

export function serviceFor(host: string): LinkService {
  const h = host.toLowerCase();
  const is = (domain: string) => h === domain || h.endsWith(`.${domain}`);
  if (is('github.com')) return 'github';
  if (is('drive.google.com') || is('docs.google.com')) return 'drive';
  if (is('linkedin.com')) return 'linkedin';
  return 'link';
}

/** Splits a URL for display. Undefined when it is not a URL at all. */
export function linkParts(url: string): LinkParts | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return undefined;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  const full = `${parsed.pathname}${parsed.search}`.replace(/\/$/, '');
  const path = full.length > PATH_MAX ? `${full.slice(0, PATH_MAX - 1)}…` : full;
  return { service: serviceFor(parsed.hostname), host, path };
}
