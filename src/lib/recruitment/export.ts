import { csvRow } from "../csv";

// The shortlist spreadsheet a lead takes away once candidates are picked. Pure, so it can be tested directly.

const YEAR_LABEL: Record<string, string> = { first: "1st Year", second: "2nd Year", third: "3rd Year", fourth: "4th Year", other: "Other" };
const DOMAIN_LABEL: Record<string, string> = { technical: "Technical", web: "Web", design: "Design", media: "Media", pr: "PR" };

interface ShortlistRow {
  name: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  domain: string;
}

/**
 * A phone number that spreadsheets keep as written. A leading "+" would be read as a formula and a 12-digit number with a country
 * code would turn into 9.19877E+11, so keep only the digits and put a space between a country code and the 10-digit number.
 */
export function exportPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? `${digits.slice(0, -10)} ${digits.slice(-10)}` : digits;
}

/** CSV text (with the byte-order mark Excel needs for non-English names) for the given applicants, one row each. */
export function shortlistCsv(rows: ShortlistRow[]): string {
  const lines = [
    csvRow(["Name", "Department", "Year", "Phone", "Email", "Domain"]),
    ...rows.map((r) => csvRow([r.name, r.department, YEAR_LABEL[r.year] ?? r.year, exportPhone(r.phone), r.email, DOMAIN_LABEL[r.domain] ?? r.domain])),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}
