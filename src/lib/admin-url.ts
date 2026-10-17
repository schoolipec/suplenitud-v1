/**
 * Canonical application/panel URL for server-side links (webhook payloads,
 * audit references). Read exclusively from server configuration:
 * APP_ADMIN_URL. Never derived from request Host/Origin headers, and never
 * silently falling back to a public demo domain — in production without the
 * variable the URL is null.
 */
export function getAdminUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env.APP_ADMIN_URL ?? "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.toString().replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
}
