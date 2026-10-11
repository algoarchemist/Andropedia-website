import { describe, expect, it } from "vitest";
import { configProblems, usesDirectSupabaseUrl, readEnv } from "@/lib/env";

describe("readEnv", () => {
  it("accepts an empty environment", () => {
    expect(() => readEnv({})).not.toThrow();
  });
  it("names every invalid variable", () => {
    let message = "";
    try {
      readEnv({ RECRUITMENT_CLOSES_AT: "soon", SMTP_PORT: "abc" });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("RECRUITMENT_CLOSES_AT");
    expect(message).toContain("SMTP_PORT");
  });
});

describe("configProblems", () => {
  it("is quiet in development with nothing set", () => {
    expect(configProblems({})).toEqual([]);
  });
  it("flags half-configured services", () => {
    const p = configProblems({ GOOGLE_SERVICE_ACCOUNT_EMAIL: "a@b.iam", SMTP_HOST: "smtp.x" });
    expect(p.join(" ")).toMatch(/Google Sheets settings are incomplete/);
    expect(p.join(" ")).toMatch(/SMTP settings are incomplete/);
  });
  it("flags an open window that ends before it starts", () => {
    const p = configProblems({ RECRUITMENT_OPENS_AT: "2026-10-20T00:00:00Z", RECRUITMENT_CLOSES_AT: "2026-10-10T00:00:00Z" });
    expect(p.join(" ")).toMatch(/must be before/);
  });
  it("requires secrets in production", () => {
    const p = configProblems({ NODE_ENV: "production" });
    expect(p.join(" ")).toMatch(/DATABASE_URL/);
    expect(p.join(" ")).toMatch(/AUTH_SECRET/);
  });
});

describe("configProblems with the Apps Script web app", () => {
  const base = {
    NODE_ENV: "production", DATABASE_URL: "postgres://x", DIRECT_URL: "postgres://x", AUTH_SECRET: "s", CRON_SECRET: "c",
    NEXT_PUBLIC_SITE_URL: "https://andropedia.example.org", MEMBER_SHEET_ID: "sheet",
  };
  it("treats the web app as both the sheet and the mail sender", () => {
    const p = configProblems({ ...base, RECRUITMENT_SHEET_WEBHOOK_URL: "https://script.google.com/x", RECRUITMENT_SHEET_WEBHOOK_SECRET: "s" });
    expect(p).toEqual([]);
  });
  it("warns about every missing piece when nothing is configured", () => {
    const p = configProblems({ NODE_ENV: "production", DATABASE_URL: "postgres://x", AUTH_SECRET: "s" }).join(" ");
    expect(p).toMatch(/No Google Sheet/);
    expect(p).toMatch(/No email sender/);
    expect(p).toMatch(/CRON_SECRET/);
  });
});

describe("production deployment checks", () => {
  const ok = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    DIRECT_URL: "postgresql://u:p@db.abc.supabase.co:5432/postgres",
    AUTH_SECRET: "x".repeat(32),
    CRON_SECRET: "y".repeat(32),
    NEXT_PUBLIC_SITE_URL: "https://andropedia.example.org",
    MEMBER_SHEET_ID: "sheet",
    SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASS: "p",
    RECRUITMENT_SHEET_WEBHOOK_URL: "https://script.google.com/x", RECRUITMENT_SHEET_WEBHOOK_SECRET: "s",
  };

  it("has no problems with a complete production setup", () => {
    expect(configProblems(ok)).toEqual([]);
  });
  it("flags a missing or localhost site URL (reset links and sitemap would break)", () => {
    expect(configProblems({ ...ok, NEXT_PUBLIC_SITE_URL: undefined }).join(" ")).toMatch(/NEXT_PUBLIC_SITE_URL is not set/);
    expect(configProblems({ ...ok, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).join(" ")).toMatch(/localhost/);
  });
  it("flags the direct Supabase connection used as DATABASE_URL, and a missing DIRECT_URL", () => {
    expect(configProblems({ ...ok, DATABASE_URL: ok.DIRECT_URL }).join(" ")).toMatch(/pooler/);
    expect(configProblems({ ...ok, DIRECT_URL: undefined }).join(" ")).toMatch(/DIRECT_URL is not set/);
  });
  it("flags the public member-sheet switch", () => {
    expect(configProblems({ ...ok, MEMBER_SHEET_ALLOW_PUBLIC: "true" }).join(" ")).toMatch(/without authentication/);
  });
  it("recognises Supabase direct and pooler hosts", () => {
    expect(usesDirectSupabaseUrl("postgresql://u:p@db.abc.supabase.co:5432/postgres")).toBe(true);
    expect(usesDirectSupabaseUrl("postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")).toBe(false);
    expect(usesDirectSupabaseUrl("postgresql://u:p@localhost:5432/postgres")).toBe(false);
  });
});
