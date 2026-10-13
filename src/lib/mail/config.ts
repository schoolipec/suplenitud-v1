export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export const DEFAULT_MAIL_FROM = "no-reply@suplenitud.com";

export function getSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const host = (env.SMTP_HOST ?? "").trim();
  const user = (env.SMTP_USER ?? "").trim();
  const pass = env.SMTP_PASS ?? "";
  if (!host || !user || !pass) return null;
  const port = Number(env.SMTP_PORT ?? "587");
  const secure = (env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    user,
    pass,
    from: (env.SMTP_FROM ?? DEFAULT_MAIL_FROM).trim() || DEFAULT_MAIL_FROM,
  };
}

/** True only when every credential needed to send exists. Never invents values. */
export function isSmtpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getSmtpConfig(env) !== null;
}
