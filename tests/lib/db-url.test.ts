import { describe, expect, it } from "vitest";
import { connectionStringForPg } from "@/lib/db-url";

const POOLER = "postgresql://u:p@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";
const params = (s: string) => Object.fromEntries(new URL(s).searchParams);

describe("connectionStringForPg", () => {
  it("makes sslmode=require work with Supabase (libpq meaning: encrypted, certificate not verified)", () => {
    expect(params(connectionStringForPg(`${POOLER}?sslmode=require`, true))).toEqual({ sslmode: "require", uselibpqcompat: "true" });
  });
  it("forces encryption in production when the URL has no sslmode, so data never travels in the clear", () => {
    expect(params(connectionStringForPg(POOLER, true))).toEqual({ sslmode: "require", uselibpqcompat: "true" });
  });
  it("does not force anything in development or for a local database", () => {
    expect(connectionStringForPg(POOLER, false)).toBe(POOLER);
    const local = "postgresql://u:p@localhost:5432/db";
    expect(connectionStringForPg(local, true)).toBe(local);
  });
  it("respects an explicit choice", () => {
    expect(params(connectionStringForPg(`${POOLER}?sslmode=verify-full`, true))).toEqual({ sslmode: "verify-full" });
    expect(params(connectionStringForPg(`${POOLER}?sslmode=disable`, true))).toEqual({ sslmode: "disable" });
    expect(params(connectionStringForPg(`${POOLER}?sslmode=require&uselibpqcompat=true`, true))).toEqual({ sslmode: "require", uselibpqcompat: "true" });
  });
  it("drops Prisma-only parameters pg does not understand, keeping the rest", () => {
    const out = params(connectionStringForPg(`${POOLER}?pgbouncer=true&connection_limit=1&sslmode=require`, true));
    expect(out).toEqual({ sslmode: "require", uselibpqcompat: "true" });
  });
  it("leaves a string it cannot parse alone", () => {
    expect(connectionStringForPg("not a url", true)).toBe("not a url");
  });
});
