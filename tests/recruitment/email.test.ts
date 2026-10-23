import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mailer", async () => ({
  escapeHtml: (await vi.importActual<typeof import("@/lib/mailer")>("@/lib/mailer")).escapeHtml,
  sendMail: vi.fn(),
}));

import { WHATSAPP_COMMUNITY_URL } from "@/content/recruitment";
import { sendMail } from "@/lib/mailer";
import { sendConfirmation } from "@/lib/recruitment/email";
import type { StoredApplication } from "@/lib/recruitment/schema";

const app: StoredApplication = {
  reference: "ANDR-2026-AB12",
  submittedAt: "2026-10-23T10:00:00.000Z",
  name: "Priya <Script>",
  registerNo: "21CS001",
  department: "CSE",
  year: "2",
  phone: "9876543210",
  email: "priya@example.com",
  profile: "",
  domain: "web",
  answers: {},
  consent: true,
};

beforeEach(() => vi.mocked(sendMail).mockReset());

describe("sendConfirmation", () => {
  it("thanks the applicant and carries the reference number, next steps and WhatsApp link", async () => {
    await sendConfirmation(app);
    const mail = vi.mocked(sendMail).mock.calls[0][0];

    expect(mail.to).toBe("priya@example.com");
    expect(mail.subject).toContain("ANDR-2026-AB12");
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain("ANDR-2026-AB12");
      expect(body).toContain("appreciate");
      expect(body).toContain("What happens next");
      expect(body).toContain("Application review");
      expect(body).toContain(WHATSAPP_COMMUNITY_URL);
      expect(body).toContain("Team Andropedia");
    }
  });

  it("links the status check to the live site, never to localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    await sendConfirmation(app);
    const { text, html } = vi.mocked(sendMail).mock.calls[0][0];
    expect(text).toContain("https://andropedia-rmp.vercel.app/join");
    expect(html).toContain('href="https://andropedia-rmp.vercel.app/join"');
    expect(text + html).not.toMatch(/localhost/);
    vi.unstubAllEnvs();
  });

  it("uses the configured public URL when there is one", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://club.example.org");
    await sendConfirmation(app);
    expect(vi.mocked(sendMail).mock.calls[0][0].text).toContain("https://club.example.org/join");
    vi.unstubAllEnvs();
  });

  it("escapes the applicant's name in the HTML", async () => {
    await sendConfirmation(app);
    const { html } = vi.mocked(sendMail).mock.calls[0][0];
    expect(html).not.toContain("<Script>");
    expect(html).toContain("Priya &lt;Script&gt;");
  });
});
