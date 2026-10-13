const SITE_NAME = "Iglesia Plenitud en Cristo";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function baseLayout(title: string, heading: string, bodyHtml: string): {subject: string; html: string; text: string} {
  const text = `${SITE_NAME}\n${heading}\n\n${bodyHtml.replaceAll(/<[^>]+>/g, "")}`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background-color:#f7fcfe;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fcfe;padding:24px 12px;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #c8e0eb;border-radius:12px;overflow:hidden;"><tr><td style="background-color:#082942;padding:20px 24px;"><p style="margin:0;color:#b6dc26;font-weight:bold;font-size:18px;">${escapeHtml(SITE_NAME)}</p></td></tr><tr><td style="padding:28px 24px;color:#082942;"><h1 style="margin:0 0 12px;font-size:22px;">${escapeHtml(heading)}</h1>${bodyHtml}<p style="margin:20px 0 0;font-size:12px;color:#46647a;">This is an automated message. Please do not reply directly to this email.</p></td></tr><tr><td style="background-color:#e7f5fb;padding:14px 24px;font-size:12px;color:#46647a;">${escapeHtml(SITE_NAME)} · Las Vegas, Nevada</td></tr></table></td></tr></table></body></html>`;
  return {subject: title, html, text};
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${escapeHtml(text)}</p>`;
}

function actionButton(label: string, href: string): string {
  return `<p style="margin:20px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;border-radius:8px;background-color:#082942;color:#ffffff;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a></p>`;
}

export type InvitationMail = {to: string; subject: string; html: string; text: string};

/** Active in this phase: first-password invitation. Link expires in 24 hours. */
export function invitationMail(input: {to: string; name: string; acceptUrl: string; expiresHours?: number}): InvitationMail {
  const hours = input.expiresHours ?? 24;
  const {subject, html, text} = baseLayout(
    "You are invited to join the administration team",
    `Welcome, ${input.name}`,
    `${paragraph("You have been invited to collaborate in the administration of Iglesia Plenitud en Cristo.")}${paragraph("Use the secure link below to set your own password for the first time. The link is single-use and expires in 24 hours.")}${actionButton("Set my password", input.acceptUrl)}${paragraph(`If the button does not work, copy this address into your browser: ${input.acceptUrl}`)}${paragraph(`This invitation expires in ${hours} hours. If it expires, ask an administrator to send a new one.`)}`,
  );
  return {to: input.to, subject, html, text};
}

export type MailTemplateKind = "invitation" | "password-recovery" | "admin-notice";

/**
 * Reusable template registry. Only "invitation" is wired to sending in this
 * phase; recovery and admin notices are prepared for future authorized phases
 * and must not be sent until then.
 */
export const mailTemplates: Record<MailTemplateKind, {active: boolean}> = {
  invitation: {active: true},
  "password-recovery": {active: false},
  "admin-notice": {active: false},
};
