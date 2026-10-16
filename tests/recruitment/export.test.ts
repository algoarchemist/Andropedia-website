import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { exportPhone, shortlistCsv } from "@/lib/recruitment/export";

const row = (over = {}) => ({ name: "Priya R", department: "CSE-A", year: "second", phone: "+91 98765 43210", email: "priya@x.com", domain: "web", ...over });

describe("shortlist export", () => {
  it("has a header and one row per applicant with the columns a lead asked for", () => {
    const cells = parseCsv(shortlistCsv([row(), row({ name: "Arun K", year: "fourth", domain: "pr" })]));
    expect(cells[0]).toEqual(["Name", "Department", "Year", "Phone", "Email", "Domain"]);
    expect(cells[1]).toEqual(["Priya R", "CSE-A", "2nd Year", "91 9876543210", "priya@x.com", "Web"]);
    expect(cells[2][2]).toBe("4th Year");
    expect(cells[2][5]).toBe("PR");
  });

  it("starts with the byte-order mark so Excel reads names correctly", () => {
    expect(shortlistCsv([row()]).charCodeAt(0)).toBe(0xfeff);
  });

  it("is just a header when nobody is shortlisted", () => {
    expect(parseCsv(shortlistCsv([]))).toHaveLength(1);
  });

  it("keeps formulas out of names and departments", () => {
    const cells = parseCsv(shortlistCsv([row({ name: "=HYPERLINK(\"http://evil\")", department: "+cmd" })]));
    expect(cells[1][0].startsWith("'")).toBe(true);
    expect(cells[1][1].startsWith("'")).toBe(true);
  });

  it("writes phone numbers that spreadsheets keep as written", () => {
    expect(exportPhone("9876543210")).toBe("9876543210");
    expect(exportPhone("+91 98765-43210")).toBe("91 9876543210");
    expect(exportPhone("(044) 2345 6789")).toBe("0 4423456789");
  });
});
