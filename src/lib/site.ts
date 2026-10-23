/** Public base URL of the site (for canonical links, sitemap and Open Graph). */
export function siteUrl(): URL {
  try {
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || vercel || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

/** The live site. Used for links in emails when no public URL is configured (for example when running locally). */
export const DEPLOYED_SITE_URL = "https://andropedia-rmp.vercel.app";

/** Base URL for links inside emails to real people: never localhost, because the link is opened on someone else's device. */
export function emailSiteUrl(): URL {
  const url = siteUrl();
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) ? new URL(DEPLOYED_SITE_URL) : url;
}

/** Pages that should appear in the sitemap. */
export const PUBLIC_PATHS = ["/", "/join", "/team", "/projects", "/events", "/terms", "/privacy"] as const;

