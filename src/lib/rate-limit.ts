type RateLimitKey = string;

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  [key: RateLimitKey]: RateLimitWindow;
}

// Simple in-memory rate limiter — suitable for single-server deployments.
// For distributed systems, upgrade to Upstash/Redis.
const store: RateLimitStore = {};

/**
 * Check and update rate limit for a given key and window.
 * @param key Identifier (e.g., IP address, user ID)
 * @param limit Max requests allowed
 * @param windowSeconds Duration of the window in seconds
 * @returns {allowed: boolean, remaining: number, resetAt: Date}
 */
export function checkRateLimit(key: RateLimitKey, limit: number, windowSeconds: number) {
  const now = Date.now();
  const window = store[key];

  if (!window || now >= window.resetAt) {
    // Create new window
    store[key] = { count: 1, resetAt: now + windowSeconds * 1000 };
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now + windowSeconds * 1000),
    };
  }

  // Increment within window
  window.count++;
  const allowed = window.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - window.count),
    resetAt: new Date(window.resetAt),
  };
}

/**
 * Get IP address from request headers (works with proxies).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

// Cleanup old entries every 5 minutes
if (typeof globalThis !== "undefined" && typeof globalThis.setInterval === "function") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of Object.entries(store)) {
      if (now >= window.resetAt) {
        delete store[key];
      }
    }
  }, 5 * 60 * 1000);
}
