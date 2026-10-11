import { GoogleAuth } from "google-auth-library";
import { DomainType, User } from "./types";

/** A member row from the sheet. `registerNo` is login data: strip it before sending anything to the browser. */
export type LiveMember = User & { registerNo: string };

// New-member Google Form responses. Read: name, email, register number, domain, LinkedIn, photo and bio.
// The sheet also holds phone numbers and dates of birth, which stay out of the app. Register numbers are never
// returned by a public endpoint.
//
// The sheet holds personal data, so it must be PRIVATE: shared only with the service account, which is read through the
// Sheets API with the read-only scope. The sheet id is configuration (MEMBER_SHEET_ID), never source code.
// Reading it through the public "anyone with the link" endpoint is only possible with MEMBER_SHEET_ALLOW_PUBLIC=true,
// meant for a throwaway local test; /api/health reports it in production.

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const REQUEST_TIMEOUT_MS = 10_000;

// Columns of the form's response tab (0-based): B email, C name, D register number, H LinkedIn, I domain, K photo, L bio.
const COL = { email: 1, name: 2, registerNo: 3, linkedin: 7, domain: 8, photo: 10, bio: 11 } as const;

export class MemberSheetNotConfiguredError extends Error {}

const domainMap: Record<string, DomainType> = {
  technical: "Technical",
  // Core team members (President and so on) pick "core" in the form. Their domain is only a fallback;
  // what shows them on the Core team is their position, which an admin sets.
  core: "Technical",
  web: "Web",
  "r&d": "R&D",
  "r & d": "R&D",
  design: "Design",
  media: "Media",
  "public relations": "PR",
  pr: "PR",
};

/** Null for anything that is not a real domain (e.g. a stray "core" entry), so that row is skipped. */
function normalizeDomain(value: string): DomainType | null {
  return domainMap[value.toLowerCase()] ?? null;
}

function normalizePhotoUrl(value: string): string {
  const match = value.match(/[?&]id=([^&]+)/);
  return match ? `/api/member-photo/${encodeURIComponent(match[1])}` : value;
}

const text = (value: unknown) => String(value ?? "").trim();

// ------------------------------------------------------------------ reading the sheet

type Row = string[];

function sheetConfig() {
  const sheetId = process.env.MEMBER_SHEET_ID?.trim();
  if (!sheetId) throw new MemberSheetNotConfiguredError("MEMBER_SHEET_ID is not set.");
  return { sheetId, gid: process.env.MEMBER_SHEET_GID?.trim() || "" };
}

let auth: GoogleAuth | undefined;
async function authedGet<T>(url: string): Promise<T> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new MemberSheetNotConfiguredError("Google service account credentials are not set.");
  auth ??= new GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const client = await auth.getClient();
  const res = await client.request<T>({ url, timeout: REQUEST_TIMEOUT_MS });
  return res.data;
}

/** Column groups to read: only what the app uses. Phone numbers, dates of birth and the rest are never requested. */
const COLUMN_GROUPS = [
  { from: "B", start: 1, to: "D" },
  { from: "H", start: 7, to: "I" },
  { from: "K", start: 10, to: "L" },
] as const;

/** Rows of the response tab through the Sheets API, using the service account. Row 1 (the headers) is dropped. */
async function rowsFromApi(): Promise<Row[]> {
  const { sheetId, gid } = sheetConfig();
  let tab = "";
  if (gid) {
    const meta = await authedGet<{ sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> }>(
      `${SHEETS_API}/${encodeURIComponent(sheetId)}?fields=sheets.properties(sheetId,title)`,
    );
    const title = meta.sheets?.find((s) => String(s.properties?.sheetId) === gid)?.properties?.title;
    if (!title) throw new Error(`The member sheet has no tab with id ${gid}.`);
    tab = `'${title.replace(/'/g, "''")}'!`;
  }
  const ranges = COLUMN_GROUPS.map((g) => `ranges=${encodeURIComponent(`${tab}${g.from}:${g.to}`)}`).join("&");
  const data = await authedGet<{ valueRanges?: Array<{ values?: string[][] }> }>(
    `${SHEETS_API}/${encodeURIComponent(sheetId)}/values:batchGet?${ranges}`,
  );
  const groups = data.valueRanges ?? [];
  const count = Math.max(0, ...groups.map((g) => g.values?.length ?? 0));
  const rows: Row[] = [];
  for (let r = 1; r < count; r++) {
    const row: Row = [];
    COLUMN_GROUPS.forEach((g, i) => (groups[i]?.values?.[r] ?? []).forEach((cell, k) => (row[g.start + k] = cell)));
    rows.push(row);
  }
  return rows;
}

/** Rows through the public gviz endpoint. Only for MEMBER_SHEET_ALLOW_PUBLIC=true: it needs the sheet to be world-readable. */
async function rowsFromPublicSheet(): Promise<Row[]> {
  const { sheetId, gid } = sheetConfig();
  const query = encodeURIComponent("select B,C,D,H,I,K,L where B is not null");
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:json${gid ? `&gid=${encodeURIComponent(gid)}` : ""}&tq=${query}`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Member sheet request failed with ${response.status}`);
  const body = await response.text();
  const json = JSON.parse(body.replace(/^[\s\S]*?setResponse\(/, "").replace(/\);?\s*$/, "")) as {
    table?: { rows?: Array<{ c?: Array<{ v?: string | number | null } | null> }> };
  };
  return (json.table?.rows ?? []).map((row) => {
    const cells = (row.c ?? []).map((cell) => text(cell?.v));
    const out: Row = [];
    [COL.email, COL.name, COL.registerNo, COL.linkedin, COL.domain, COL.photo, COL.bio].forEach((index, i) => (out[index] = cells[i] ?? ""));
    return out;
  });
}

export async function getLiveMembers(): Promise<LiveMember[]> {
  const rows = process.env.MEMBER_SHEET_ALLOW_PUBLIC === "true" ? await rowsFromPublicSheet() : await rowsFromApi();

  // Rows are in submission order. People who filled the form twice keep their latest answers.
  const byEmail = new Map<string, LiveMember>();
  for (const row of rows) {
    const email = text(row[COL.email]).toLowerCase();
    const name = text(row[COL.name]).replace(/\s+/g, " ");
    const registerNo = text(row[COL.registerNo]).replace(/\s+/g, "").toUpperCase();
    const domain = normalizeDomain(text(row[COL.domain]));
    if (!email || !name || !domain || !registerNo) continue;

    byEmail.set(email, {
      id: `sheet_${email.replace(/[^a-z0-9]+/g, "_")}`,
      name,
      email,
      registerNo,
      role: "member",
      domain,
      avatar: normalizePhotoUrl(text(row[COL.photo])),
      bio: text(row[COL.bio]),
      linkedin: text(row[COL.linkedin]),
      points: 0,
      tasksCompleted: 0,
      streakWeeks: 0,
    });
  }
  return [...byEmail.values()];
}
