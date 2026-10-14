const PUBLIC_LOCALES = ["en", "es", "pt", "ko", "de"] as const;

const INTERNAL_FIRST_SEGMENTS = new Set(["admin", "api", "invite"]);

/**
 * True only for public visitor pages. Excludes /admin (any locale prefix),
 * /api, /invite and any other internal route. Server-side gate: the client
 * tracker may still send, but excluded paths are never persisted.
 */
export function isPublicPath(path: unknown): boolean {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  let first = segments[0].toLowerCase();
  if ((PUBLIC_LOCALES as readonly string[]).includes(first)) {
    if (segments.length === 1) return true;
    first = segments[1].toLowerCase();
  }
  return !INTERNAL_FIRST_SEGMENTS.has(first);
}

const BOT_PATTERN =
  /(bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|chatgpt-user|claudebot|anthropic-ai|ccbot|perplexity|cohere-ai|applebot|bingpreview|duckduckbot|archive\.org|monitor|uptime|pingdom|lighthouse|headless|phantomjs|selenium|playwright|puppeteer)/i;

/** True for known crawlers, monitors and automation libraries. Case-insensitive. */
export function isBotUserAgent(userAgent: unknown): boolean {
  if (typeof userAgent !== "string" || userAgent.trim().length === 0) return false;
  return BOT_PATTERN.test(userAgent);
}

const BETTER_AUTH_SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

/**
 * True when the request carries a signed-in session cookie. Authenticated
 * visits (administrators included) are never counted as public visits.
 */
export function hasSessionCookie(cookieHeader: unknown): boolean {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) return false;
  const names = new Set(
    cookieHeader
      .split(";")
      .map((part) => part.split("=").shift()?.trim().toLowerCase())
      .filter(Boolean),
  );
  return BETTER_AUTH_SESSION_COOKIES.some((name) => names.has(name.toLowerCase()));
}
