// Prepares DATABASE_URL for the `pg` driver.
//
// Two things go wrong with Supabase and a plain URL:
//  - `?sslmode=require` makes `pg` verify the certificate like `verify-full`, and Supabase's certificate chain is not in Node's
//    trust store, so the connection fails with "self-signed certificate in certificate chain". `uselibpqcompat=true` gives
//    `require` its usual meaning (encrypted, certificate not verified), which is what Supabase documents.
//  - With no `sslmode` at all `pg` connects WITHOUT encryption. In production that would send passwords and member data in the clear.
// Prisma-only parameters (`pgbouncer`, `connection_limit`, `pool_timeout`) mean nothing to `pg` and are dropped.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const PRISMA_ONLY = ["pgbouncer", "connection_limit", "pool_timeout"];

export function connectionStringForPg(raw: string, production = process.env.NODE_ENV === "production"): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw; // not a URL we understand: let pg report the problem
  }
  for (const name of PRISMA_ONLY) url.searchParams.delete(name);

  const mode = url.searchParams.get("sslmode");
  const local = LOCAL_HOSTS.has(url.hostname);
  if (mode && ["require", "prefer", "verify-ca"].includes(mode) && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  } else if (!mode && production && !local) {
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("uselibpqcompat", "true");
  }
  return url.toString();
}
