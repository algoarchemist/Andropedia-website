import { PROCESS_STEPS, RECRUITMENT_CYCLE, WHATSAPP_COMMUNITY_URL } from "@/content/recruitment";
import { emailSiteUrl } from "../site";
import { escapeHtml as esc, sendMail } from "../mailer";
import { DOMAIN_LABELS, type StoredApplication } from "./schema";

// Step 1 of the process is the application itself, which they have just done.
const NEXT_STEPS = PROCESS_STEPS.slice(1);

export async function sendConfirmation(app: StoredApplication): Promise<void> {
  const domain = DOMAIN_LABELS[app.domain as keyof typeof DOMAIN_LABELS] ?? app.domain;
  const statusUrl = new URL("/join", emailSiteUrl()).toString();
  const subject = `Thanks for applying to Andropedia, ${app.name} (${app.reference})`;

  const text = [
    `Hi ${app.name},`,
    "",
    `Thank you for applying to Andropedia! We really appreciate you taking the time to apply for ${RECRUITMENT_CYCLE}, and we're excited to read about you.`,
    "",
    `Your reference number: ${app.reference}`,
    `Domain: ${domain}`,
    "Keep this number safe. You'll need it, along with this email address, to check your application status.",
    "",
    "What happens next:",
    ...NEXT_STEPS.map((s, i) => `${i + 1}. ${s.title}: ${s.text}`),
    "",
    `Check your application status any time: ${statusUrl}`,
    "",
    "Join our WhatsApp community to meet the team and stay updated:",
    WHATSAPP_COMMUNITY_URL,
    "",
    "Questions? Reply to this email and quote your reference number.",
    "",
    "Thank you once again for being interested in Andropedia. We can't wait to see what you build.",
    "",
    "Warm regards,",
    "Team Andropedia",
  ].join("\n");

  const steps = NEXT_STEPS.map(
    (s, i) => `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#16a34a;font-weight:bold">${i + 1}.</td>
<td style="padding:6px 0"><strong>${esc(s.title)}</strong><br><span style="color:#444">${esc(s.text)}</span></td></tr>`,
  ).join("\n");

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111;max-width:560px">
<p>Hi ${esc(app.name)},</p>
<p>Thank you for applying to <strong>Andropedia</strong>! We really appreciate you taking the time to apply for ${esc(RECRUITMENT_CYCLE)}, and we're excited to read about you.</p>
<div style="background:#f4f6f8;border-radius:8px;padding:14px 16px;margin:16px 0">
<div style="color:#555;font-size:13px">Your reference number</div>
<div style="font-size:22px;font-weight:bold;letter-spacing:1px">${esc(app.reference)}</div>
<div style="color:#555;font-size:13px;margin-top:6px">Domain: ${esc(domain)}</div>
</div>
<p style="color:#444;font-size:14px">Keep this number safe. You'll need it, along with this email address, to check your application status.</p>
<p style="margin-bottom:4px"><strong>What happens next</strong></p>
<table style="border-collapse:collapse">${steps}</table>
<p><a href="${esc(statusUrl)}" style="color:#2563eb">Check your application status</a> any time.</p>
<div style="border:1px solid #25D366;border-radius:8px;padding:14px 16px;margin:20px 0">
<p style="margin:0 0 10px"><strong>Join our WhatsApp community</strong><br><span style="color:#444">Meet the team, hear about challenges and events, and stay updated.</span></p>
<a href="${esc(WHATSAPP_COMMUNITY_URL)}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:bold;padding:10px 20px;border-radius:6px">Join the WhatsApp community</a>
</div>
<p>Questions? Reply to this email and quote your reference number.</p>
<p>Thank you once again for being interested in Andropedia. We can't wait to see what you build.</p>
<p>Warm regards,<br><strong>Team Andropedia</strong></p></div>`;

  await sendMail({ to: app.email, subject, text, html });
}
