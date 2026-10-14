const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_PATTERN = /^[0-9a-fA-F:.]+$/;

function isIpLiteral(value: string): boolean {
  const candidate = value.trim().replace(/^\[(.*)\]$/, "$1").split("%")[0];
  if (candidate.length === 0 || candidate.length > 45) return false;
  if (IPV4_PATTERN.test(candidate)) return true;
  return candidate.includes(":") && IPV6_PATTERN.test(candidate);
}

/**
 * Resolve the visitor IP for in-memory geolocation only. The leftmost
 * X-Forwarded-For entry is honored solely when the proxy chain is explicitly
 * trusted (GEO_TRUST_PROXY_HEADERS=true behind controlled Traefik).
 * Returns null otherwise. The IP is never persisted anywhere.
 */
export function resolveClientIp(headers: Headers, trustProxy: boolean): string | null {
  if (!trustProxy) return null;
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const first = forwarded.split(",")[0]?.trim() ?? "";
  if (!isIpLiteral(first)) return null;
  return first.replace(/^\[(.*)\]$/, "$1").split("%")[0];
}

/** Trust switch reader kept explicit so tests can pass the flag directly. */
export function isProxyTrusted(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.GEO_TRUST_PROXY_HEADERS === "true";
}
