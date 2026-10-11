import { z } from "zod";

// Central, validated view of the environment. Empty values (KEY=) count as unset.
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const text = z.preprocess(blank, z.string().optional());
const isoDate = z.preprocess(blank, z.iso.datetime({ offset: true, error: "must be an ISO date with a timezone, e.g. 2026-10-20T23:59:00+05:30" }).optional());

const schema = z.object({
  NODE_ENV: text,
  DATABASE_URL: text,
  AUTH_SECRET: text,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: text,
  GOOGLE_PRIVATE_KEY: text,
  RECRUITMENT_SHEET_ID: text,
  RECRUITMENT_SHEET_TAB: text,
  RECRUITMENT_SHEET_WEBHOOK_URL: text,
  RECRUITMENT_SHEET_WEBHOOK_SECRET: text,
  SMTP_HOST: text,
  SMTP_PORT: z.preprocess(blank, z.coerce.number().int().min(1).max(65535).optional()),
  SMTP_USER: text,
  SMTP_PASS: text,
  EMAIL_FROM: text,
  EMAIL_REPLY_TO: text,
  RECRUITMENT_OPEN: z.preprocess(blank, z.enum(["true", "false"]).optional()),
  RECRUITMENT_OPENS_AT: isoDate,
  RECRUITMENT_CLOSES_AT: isoDate,
  CRON_SECRET: text,
  NEXT_PUBLIC_SITE_URL: z.preprocess(blank, z.url().optional()),
  DIRECT_URL: text,
  PG_POOL_MAX: z.preprocess(blank, z.coerce.number().int().min(1).max(50).optional()),
  TRUSTED_PROXY_HOPS: z.preprocess(blank, z.coerce.number().int().min(1).max(10).optional()),
  MEMBER_SHEET_ID: text,
  MEMBER_SHEET_GID: text,
  MEMBER_SHEET_ALLOW_PUBLIC: z.preprocess(blank, z.enum(["true", "false"]).optional()),
});

export type Env = z.infer<typeof schema>;

/** Parses the environment. Throws a readable error listing every invalid variable. */
export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      "Invalid environment: " + parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")
    );
  }
  return parsed.data;
}

/** Everything wrong with the current configuration, as plain sentences (used by /api/health). */
export function configProblems(source: Record<string, string | undefined> = process.env): string[] {
  const problems: string[] = [];
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    for (const i of parsed.error.issues) problems.push(`${i.path.join(".")}: ${i.message}`);
    return problems;
  }
  const e = parsed.data;
  const production = e.NODE_ENV === "production";

  const google = [e.GOOGLE_SERVICE_ACCOUNT_EMAIL, e.GOOGLE_PRIVATE_KEY, e.RECRUITMENT_SHEET_ID];
  if (google.some(Boolean) && !google.every(Boolean)) {
    problems.push("Google Sheets settings are incomplete (need service account email, private key and sheet id).");
  }
  const smtp = [e.SMTP_HOST, e.SMTP_USER, e.SMTP_PASS];
  if (smtp.some(Boolean) && !smtp.every(Boolean)) problems.push("SMTP settings are incomplete (need host, user and password).");

  if (e.RECRUITMENT_OPENS_AT && e.RECRUITMENT_CLOSES_AT && Date.parse(e.RECRUITMENT_OPENS_AT) >= Date.parse(e.RECRUITMENT_CLOSES_AT)) {
    problems.push("RECRUITMENT_OPENS_AT must be before RECRUITMENT_CLOSES_AT.");
  }

  if (production) {
    if (!e.DATABASE_URL) problems.push("DATABASE_URL is not set.");
    if (!e.AUTH_SECRET) problems.push("AUTH_SECRET is not set (member logins cannot be checked).");
    const webApp = !!(e.RECRUITMENT_SHEET_WEBHOOK_URL && e.RECRUITMENT_SHEET_WEBHOOK_SECRET);
    if (!google.every(Boolean) && !webApp) problems.push("No Google Sheet is configured: applications are kept in the database only.");
    if (!smtp.every(Boolean) && !webApp) problems.push("No email sender is configured (SMTP or the Apps Script web app): confirmation emails and login codes cannot be sent.");
    if (!e.CRON_SECRET) problems.push("CRON_SECRET is not set: the retry and cleanup endpoints are disabled.");
    if (!e.NEXT_PUBLIC_SITE_URL) {
      problems.push("NEXT_PUBLIC_SITE_URL is not set: password-reset links, the sitemap and share previews would point to localhost.");
    } else if (/localhost|127\.0\.0\.1/.test(e.NEXT_PUBLIC_SITE_URL)) {
      problems.push("NEXT_PUBLIC_SITE_URL points to localhost.");
    }
    if (e.DATABASE_URL && usesDirectSupabaseUrl(e.DATABASE_URL)) {
      problems.push("DATABASE_URL is the direct Supabase connection (port 5432). Serverless hosting needs the pooler URL (port 6543); keep the direct one in DIRECT_URL for migrations only.");
    }
    if (!e.DIRECT_URL) problems.push("DIRECT_URL is not set: `npm run db:deploy` (migrations) needs the direct database connection.");
    if (e.MEMBER_SHEET_ALLOW_PUBLIC === "true") problems.push("MEMBER_SHEET_ALLOW_PUBLIC is on: the member sheet is read without authentication. Make the sheet private and turn this off.");
    if (!e.MEMBER_SHEET_ID) problems.push("MEMBER_SHEET_ID is not set: member import and the sheet fallback are disabled.");
  }
  return problems;
}

/** True for Supabase's direct Postgres host (db.<ref>.supabase.co) or port 5432 on a Supabase host, i.e. not the connection pooler. */
export function usesDirectSupabaseUrl(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    if (!/supabase\.(co|com)$/.test(url.hostname)) return false;
    if (url.hostname.startsWith("db.")) return true;
    return url.port === "5432" && !url.hostname.includes("pooler");
  } catch {
    return false;
  }
}
