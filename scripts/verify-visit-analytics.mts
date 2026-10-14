import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {hasSessionCookie, isBotUserAgent, isPublicPath} from "../src/lib/analytics/filters";
import {isProxyTrusted, resolveClientIp} from "../src/lib/analytics/privacy";
import {isGeoAvailable, resolveGeoIp} from "../src/lib/analytics/geo";
import {resolveDateRange} from "../src/lib/analytics/range";

const root = join(import.meta.dirname, "..");

function headers(pairs: Record<string, string>): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(pairs)) h.set(key, value);
  return h;
}

// Public paths only: admin, api and invite excluded in every locale
assert.equal(isPublicPath("/"), true);
assert.equal(isPublicPath("/pastors/"), true);
assert.equal(isPublicPath("/es/"), true);
assert.equal(isPublicPath("/es/pastors/"), true);
assert.equal(isPublicPath("/admin"), false);
assert.equal(isPublicPath("/admin/users"), false);
assert.equal(isPublicPath("/admin/sign-in"), false);
assert.equal(isPublicPath("/es/admin"), false);
assert.equal(isPublicPath("/es/admin/sign-in"), false);
assert.equal(isPublicPath("/pt/admin/visits"), false);
assert.equal(isPublicPath("/en/admin"), false);
assert.equal(isPublicPath("/api"), false);
assert.equal(isPublicPath("/api/analytics"), false);
assert.equal(isPublicPath("/api/prayer"), false);
assert.equal(isPublicPath("/es/api/analytics"), false);
assert.equal(isPublicPath("/pt/api/prayer"), false);
assert.equal(isPublicPath("/invite"), false);
assert.equal(isPublicPath("/invite/abc"), false);
assert.equal(isPublicPath("/pt/invite/token"), false);
assert.equal(isPublicPath("/ko/invite/abc"), false);
assert.equal(isPublicPath(""), false);
assert.equal(isPublicPath(null), false);
assert.equal(isPublicPath("/administrator"), true);
assert.equal(isPublicPath("/es/apiary"), true);
assert.equal(isPublicPath("/pt/invited-guests"), true);

// Known bots excluded, real browsers kept
assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"), true);
assert.equal(isBotUserAgent("GPTBot/1.0"), true);
assert.equal(isBotUserAgent("ClaudeBot/1.0"), true);
assert.equal(isBotUserAgent("CCBot/2.0 (+https://commoncrawl.org/faq/)"), true);
assert.equal(isBotUserAgent("UptimeRobot/2.0"), true);
assert.equal(
  isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"),
  false,
);
assert.equal(isBotUserAgent(""), false);
assert.equal(isBotUserAgent(null), false);

// Authenticated sessions are never counted
assert.equal(hasSessionCookie("better-auth.session_token=abc; theme=light"), true);
assert.equal(hasSessionCookie("__Secure-better-auth.session_token=abc"), true);
assert.equal(hasSessionCookie("theme=light; locale=es"), false);
assert.equal(hasSessionCookie(""), false);
assert.equal(hasSessionCookie(null), false);

// Proxy trust gate: X-Forwarded-For honored only when explicitly trusted
assert.equal(isProxyTrusted({GEO_TRUST_PROXY_HEADERS: "true"} as unknown as NodeJS.ProcessEnv), true);
assert.equal(isProxyTrusted({} as unknown as NodeJS.ProcessEnv), false);
assert.equal(isProxyTrusted({GEO_TRUST_PROXY_HEADERS: "false"} as unknown as NodeJS.ProcessEnv), false);
assert.equal(resolveClientIp(headers({"x-forwarded-for": "203.0.113.7"}), false), null);
assert.equal(resolveClientIp(headers({"x-forwarded-for": "203.0.113.7, 10.0.0.1"}), true), "203.0.113.7");
assert.equal(resolveClientIp(headers({"x-forwarded-for": "2001:db8::1"}), true), "2001:db8::1");
assert.equal(resolveClientIp(headers({"x-forwarded-for": "not-an-ip"}), true), null);
assert.equal(resolveClientIp(headers({}), true), null);

// GeoLite fallback: no database, no geography, analytics keeps working
assert.equal(isGeoAvailable({} as unknown as NodeJS.ProcessEnv), false);
assert.equal(isGeoAvailable({GEOIP_DATABASE_PATH: "/nonexistent/GeoLite2-City.mmdb"} as unknown as NodeJS.ProcessEnv), false);
assert.deepEqual(await resolveGeoIp(null), {});
assert.deepEqual(await resolveGeoIp("8.8.8.8"), {});

// Date range: 30-day default, invalid fallback, inverted swap
const now = new Date("2026-10-14T12:00:00.000Z");
const defaults = resolveDateRange({}, now);
assert.equal(defaults.fromInput, "2026-09-15");
assert.equal(defaults.toInput, "2026-10-14");
const explicit = resolveDateRange({from: "2026-10-01", to: "2026-10-07"}, now);
assert.equal(explicit.fromInput, "2026-10-01");
assert.equal(explicit.toInput, "2026-10-07");
const swapped = resolveDateRange({from: "2026-10-07", to: "2026-10-01"}, now);
assert.equal(swapped.fromInput, "2026-10-01");
assert.equal(swapped.toInput, "2026-10-07");
const invalid = resolveDateRange({from: "nope", to: "2026-13-99"}, now);
assert.equal(invalid.fromInput, "2026-09-15");
assert.equal(invalid.toInput, "2026-10-14");

// Route wiring: every privacy gate present, IP never persisted
const analyticsRoute = readFileSync(join(root, "src/app/api/analytics/route.ts"), "utf8");
assert.match(analyticsRoute, /isPublicPath/);
assert.match(analyticsRoute, /isBotUserAgent/);
assert.match(analyticsRoute, /hasSessionCookie/);
assert.match(analyticsRoute, /resolveClientIp/);
assert.match(analyticsRoute, /isProxyTrusted/);
assert.match(analyticsRoute, /resolveGeoIp/);
assert.match(analyticsRoute, /isPublic: true/);
assert.ok(!analyticsRoute.includes("ipAddress"));
assert.ok(!analyticsRoute.includes("sha256"));
assert.ok(!analyticsRoute.includes("x-forwarded-for"));

// Geo module: US-only regions, coarse data only
const geoLib = readFileSync(join(root, "src/lib/analytics/geo.ts"), "utf8");
assert.match(geoLib, /countryCode === "US"/);
assert.ok(!geoLib.includes("city:"));
assert.match(geoLib, /existsSync/);

// Migration: backfill flags historical internals, deletes nothing
const migration = readFileSync(join(root, "prisma/migrations/20261015000000_public_visit_analytics/migration.sql"), "utf8");
assert.match(migration, /ADD COLUMN "is_public"/);
assert.match(migration, /\/admin/);
assert.match(migration, /\/api\//);
assert.match(migration, /\/invite/);
assert.match(migration, /en\|es\|pt\|ko\|de/);
// Localized coverage segments the first component after the locale for each area
assert.match(migration, /\^\/\(en\|es\|pt\|ko\|de\)\/admin\(\/\|\$\)/);
assert.match(migration, /\^\/\(en\|es\|pt\|ko\|de\)\/api\(\/\|\$\)/);
assert.match(migration, /\^\/\(en\|es\|pt\|ko\|de\)\/invite\(\/\|\$\)/);
// Similar public routes stay untouched: the segment must end or continue with /
assert.ok(!migration.includes("/apiary"));
assert.ok(!migration.includes("/administrator"));
assert.ok(!migration.toUpperCase().includes("DELETE FROM"));

// Visits report: public-only aggregates, distinct sessions, US states, geo state
const visitsPage = readFileSync(join(root, "src/app/admin/visits/page.tsx"), "utf8");
assert.match(visitsPage, /isPublic: true/);
assert.match(visitsPage, /resolveDateRange/);
assert.match(visitsPage, /by: \["sessionId"\]/);
assert.match(visitsPage, /sessionGroups\.length/);
assert.match(visitsPage, /countryCode: "US"/);
assert.match(visitsPage, /isGeoAvailable/);
assert.match(visitsPage, /VisitsDashboard/);
const visitsDashboard = readFileSync(join(root, "src/components/admin/VisitsDashboard.tsx"), "utf8");
assert.match(visitsDashboard, /Geography unavailable/);
assert.match(visitsDashboard, /Unique sessions/);
assert.match(visitsDashboard, /US states/);
assert.match(visitsDashboard, /name="from"/);
assert.match(visitsDashboard, /name="to"/);

// Tracker skips internal paths before sending
const tracker = readFileSync(join(root, "src/components/analytics/PageViewTracker.tsx"), "utf8");
assert.match(tracker, /"admin"/);
assert.match(tracker, /"api"/);
assert.match(tracker, /"invite"/);

// maxmind reader dependency present
const packageJson = readFileSync(join(root, "package.json"), "utf8");
assert.match(packageJson, /"maxmind"/);

console.log("verify-visit-analytics: all checks passed");
console.log("  - Public paths only: admin/api/invite excluded in every locale");
console.log("  - Known bots and authenticated sessions never counted");
console.log("  - X-Forwarded-For trusted only behind explicit flag; malformed values rejected");
console.log("  - GeoLite fallback without database; US-only regions; no city or IP persisted");
console.log("  - Migration flags historical internals without deleting rows");
console.log("  - Visits report: date range, distinct sessions, countries, US states, geo state");
