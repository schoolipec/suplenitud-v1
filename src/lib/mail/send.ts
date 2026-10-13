import nodemailer from "nodemailer";
import {getSmtpConfig} from "@/lib/mail/config";
import {mailTemplates, type InvitationMail} from "@/lib/mail/templates";

export type SendResult = {sent: boolean; reason: string};

/**
 * Sends only templates activated for the current phase. Today that is the
 * invitation mail. Returns sent:false with an explicit reason instead of ever
 * reporting a false delivery.
 */
export async function sendInvitationMail(mail: InvitationMail): Promise<SendResult> {
  if (!mailTemplates.invitation.active) return {sent: false, reason: "template_disabled"};
  const config = getSmtpConfig();
  if (!config) return {sent: false, reason: "smtp_not_configured"};
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {user: config.user, pass: config.pass},
    });
    await transporter.sendMail({from: config.from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text});
    return {sent: true, reason: "sent"};
  } catch {
    return {sent: false, reason: "smtp_send_failed"};
  }
}
