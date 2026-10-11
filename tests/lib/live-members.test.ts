import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const g = vi.hoisted(() => ({ requests: [] as string[], responder: (_url: string): unknown => ({}) }));
vi.mock("google-auth-library", () => ({
  GoogleAuth: class {
    async getClient() {
      return { request: async ({ url }: { url: string }) => (g.requests.push(url), { data: g.responder(url) }) };
    }
  },
}));

import { getLiveMembers, MemberSheetNotConfiguredError } from "@/lib/live-members";

const env = { MEMBER_SHEET_ID: "sheet123", GOOGLE_SERVICE_ACCOUNT_EMAIL: "bot@x.iam.gserviceaccount.com", GOOGLE_PRIVATE_KEY: "key" };

beforeEach(() => {
  g.requests = [];
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
});
afterEach(() => vi.unstubAllEnvs());

describe("getLiveMembers (private sheet through the service account)", () => {
  it("reads only the columns the app needs, never the phone or date-of-birth columns", async () => {
    g.responder = () => ({ valueRanges: [{ values: [] }, { values: [] }, { values: [] }] });
    await getLiveMembers();
    const url = new URL(g.requests[0]);
    expect(url.pathname).toContain("/values:batchGet");
    // exactly these three groups: B-D (email, name, register number), H-I (LinkedIn, domain), K-L (photo, bio)
    expect(url.searchParams.getAll("ranges")).toEqual(["B:D", "H:I", "K:L"]);
  });

  it("builds members from the three column groups and skips the header row", async () => {
    g.responder = () => ({
      valueRanges: [
        { values: [["email", "name", "reg"], ["a@x.org", "  Aarav   Sharma ", "ra25 11026020025"]] }, // B..D
        { values: [["linkedin", "domain"], ["https://linkedin.com/in/aarav", "Web"]] }, // H..I
        { values: [["photo", "bio"], ["https://drive.google.com/open?id=PHOTO123", "Builds things"]] }, // K..L
      ],
    });
    const [m] = await getLiveMembers();
    expect(m).toMatchObject({ email: "a@x.org", name: "Aarav Sharma", registerNo: "RA2511026020025", domain: "Web", bio: "Builds things", linkedin: "https://linkedin.com/in/aarav" });
    expect(m.avatar).toBe("/api/member-photo/PHOTO123");
  });

  it("skips rows with no real domain or no register number, and keeps a person's latest answers", async () => {
    g.responder = () => ({
      valueRanges: [
        { values: [["h"], ["a@x.org", "Old Name", "RA1"], ["b@x.org", "Bee", ""], ["a@x.org", "New Name", "RA1"]] },
        { values: [["h"], ["", "Web"], ["", "Web"], ["", "Design"]] },
        { values: [["h"], [], [], []] },
      ],
    });
    const members = await getLiveMembers();
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ email: "a@x.org", name: "New Name", domain: "Design" });
  });

  it("refuses to run without a configured sheet or credentials, instead of falling back to a public read", async () => {
    vi.stubEnv("MEMBER_SHEET_ID", "");
    await expect(getLiveMembers()).rejects.toBeInstanceOf(MemberSheetNotConfiguredError);
    vi.stubEnv("MEMBER_SHEET_ID", "sheet123");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "");
    await expect(getLiveMembers()).rejects.toBeInstanceOf(MemberSheetNotConfiguredError);
  });

  it("only reads the world-readable endpoint when MEMBER_SHEET_ALLOW_PUBLIC is on", async () => {
    const fetchMock = vi.fn(async () => new Response('/*O_o*/\ngoogle.visualization.Query.setResponse({"table":{"rows":[]}});'));
    vi.stubGlobal("fetch", fetchMock);
    await getLiveMembers();
    expect(fetchMock).not.toHaveBeenCalled(); // default: authenticated API only
    vi.stubEnv("MEMBER_SHEET_ALLOW_PUBLIC", "true");
    g.responder = () => ({});
    await getLiveMembers();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = decodeURIComponent((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(calledUrl).toContain("select B,C,D,H,I,K,L"); // still only the needed columns
    vi.unstubAllGlobals();
  });
});
