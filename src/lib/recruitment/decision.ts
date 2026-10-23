import { escapeHtml as esc, sendMail } from "../mailer";

export const APPLICATION_STATUSES = ["new", "shortlisted", "accepted", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses that have an email for the applicant. "new" is the starting state and sends nothing. */
export type DecisionStatus = Exclude<ApplicationStatus, "new">;

const COPY: Record<DecisionStatus, { subject: (ref: string) => string; body: string[] }> = {
  shortlisted: {
    subject: (ref) => `You're shortlisted for Andropedia (${ref})`,
    body: [
      "Good news: you've been shortlisted for the next round of Andropedia recruitment.",
      "A domain lead will contact you shortly with the details. Please keep an eye on this inbox.",
    ],
  },
  accepted: {
    subject: (ref) => `Welcome to Andropedia (${ref})`,
    body: [
      "Congratulations! You've been accepted into Andropedia.",
      "We'll email you the onboarding steps and how to log in to the member portal.",
    ],
  },
  rejected: {
    subject: (ref) => `Your Andropedia application (${ref})`,
    body: [
      "Thank you for applying to Andropedia and for the time you put into your application.",
      "We weren't able to offer you a place this time. We'd love to see you apply again in a future cycle.",
    ],
  },
};

export async function sendDecision(app: { name: string; email: string; reference: string }, status: DecisionStatus): Promise<void> {
  const copy = COPY[status];
  const text = [`Hi ${app.name},`, "", ...copy.body.flatMap((l) => [l, ""]), `Reference ID: ${app.reference}`, "", "- Team Andropedia"].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;max-width:560px">
<p>Hi ${esc(app.name)},</p>
${copy.body.map((l) => `<p>${esc(l)}</p>`).join("\n")}
<p style="color:#555">Reference ID: <strong>${esc(app.reference)}</strong></p>
<p>- Team Andropedia</p></div>`;
  await sendMail({ to: app.email, subject: copy.subject(app.reference), text, html });
}

/** What an applicant is allowed to see. A rejection is stated clearly (never hinted at), but kindly. */
export const PUBLIC_STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: "Thank you for applying to Andropedia! Your application is safely received and our domain leads are reading it with care. There's nothing more you need to do right now. We'll email you as soon as there's news, so keep an eye on your inbox (and your spam folder, just in case).",
  shortlisted:
    "Great news, you've been shortlisted! Your application stood out to us and we're excited about what comes next. Watch your email for the next step, and get ready to show us what you can do.",
  accepted:
    "Congratulations, and welcome to Andropedia! We're so happy to have you with us. Check your email for your onboarding steps and how to log in to the member portal. Your journey starts now.",
  rejected:
    "Thank you so much for applying to Andropedia and for the effort you put into your application. We weren't able to offer you a place in this round, and we know that's not easy to hear. Please don't be discouraged: every builder starts somewhere, and your curiosity matters more than any single result. Keep learning, keep building, and we'd be glad to see you apply again in a future cycle.",
};
