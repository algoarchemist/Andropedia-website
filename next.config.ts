import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Only directives that cannot break Next.js inline scripts/styles. A full `script-src` needs per-request nonces, which would
// turn every static page dynamic; until that is worth it, these still block framing, plugins, stray form targets,
// cross-site XHR and embeds.
const csp = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // `NEXT_DIST_DIR=.next-build npm run build` builds somewhere else, so a build never disturbs a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: "/members",
        destination: "/team",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
