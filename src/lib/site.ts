/** Public base URL of the site (for canonical links, sitemap and Open Graph). */
export function siteUrl(): URL {
  try {
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || vercel || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

/** Pages that should appear in the sitemap. */
export const PUBLIC_PATHS = ["/", "/join", "/team", "/projects", "/events", "/terms", "/privacy"] as const;

