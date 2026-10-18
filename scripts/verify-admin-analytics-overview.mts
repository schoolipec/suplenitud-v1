import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {OVERVIEW_WINDOW_DAYS, bucketByDay, hasAnyViews, overviewWindow, topEntry} from "../src/lib/analytics/summary";
import {adminMessages} from "../src/i18n/admin-shell";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/* Window: fixed trailing 30 days ending at the query moment */
assert.equal(OVERVIEW_WINDOW_DAYS, 30);
const now = new Date("2026-10-14T12:00:00.000Z");
const window = overviewWindow(now);
assert.equal(window.days.length, 30);
assert.equal(window.days[0], "2026-09-15");
assert.equal(window.days[29], "2026-10-14");
assert.equal(window.from.toISOString(), "2026-09-15T00:00:00.000Z");
assert.equal(window.to.toISOString(), now.toISOString());

/* Daily bucketing: exactly 30 points, days without events stay 0, out-of-window ignored */
const buckets = bucketByDay(
  [
    {occurredAt: new Date("2026-09-15T00:00:00Z")},
    {occurredAt: new Date("2026-09-20T12:00:00Z")},
    {occurredAt: new Date("2026-10-14T03:00:00Z")},
    {occurredAt: new Date("2026-10-14T20:00:00Z")},
    {occurredAt: new Date("2026-09-01T00:00:00Z")},
  ],
  window.days,
);
assert.equal(buckets.length, 30);
assert.deepEqual(buckets[0], {date: "2026-09-15", count: 1});
assert.equal(buckets.find((point) => point.date === "2026-09-20")?.count, 1);
assert.equal(buckets[buckets.length - 1].count, 2);
assert.equal(buckets.reduce((sum, point) => sum + point.count, 0), 4, "out-of-window events are ignored");
assert.equal(buckets.filter((point) => point.count === 0).length, 27, "days without events remain at zero");

/* Zero visits produces a complete all-zero series */
const empty = bucketByDay([], window.days);
assert.equal(empty.length, 30);
assert.ok(empty.every((point) => point.count === 0));
assert.equal(hasAnyViews(empty), false);
assert.equal(hasAnyViews(buckets), true);

/* Top entry: highest non-empty label, null when nothing to show */
assert.equal(topEntry([]), null);
assert.equal(topEntry([{label: "", count: 9}, {label: null, count: 4}]), null);
assert.equal(topEntry([{label: "/a", count: 0}]), null);
assert.deepEqual(topEntry([{label: "/", count: 2}, {label: "/pastors", count: 7}]), {label: "/pastors", count: 7});
assert.deepEqual(topEntry([{label: "  ", count: 5}, {label: "United States", count: 3}]), {label: "United States", count: 3});

/* Server aggregate: public-only window, Prisma aggregation, no forbidden columns */
const overview = stripComments(read("src/lib/analytics/overview.ts"));
assert.match(overview, /isPublic: true/);
assert.match(overview, /overviewWindow\(now\)/);
assert.match(overview, /bucketByDay\(events, days\)/);
assert.match(overview, /isGeoAvailable\(\)/);
assert.match(overview, /groupBy\(\{by: \["sessionId"\]/);
assert.match(overview, /groupBy\(\{\s*by: \["path"\]/);
assert.match(overview, /select: \{occurredAt: true\}/);
assert.ok(!/\$queryRaw|\$executeRaw/.test(overview), "aggregation is done with Prisma, not raw SQL");
for (const forbidden of ["city", "postal", "ipAddress", "userAgent", "userAgentFamily", "sessionId: true"]) {
  assert.ok(!overview.includes(forbidden), `overview aggregate must not reference ${forbidden}`);
}

/* Component: link to detail, catalogue-driven text, a11y table, static */
const component = stripComments(read("src/components/admin/OverviewVisitsSummary.tsx"));
assert.match(component, /href="\/admin\/visits"/);
assert.match(component, /useAdminShell/);
assert.match(component, /ov\.geoUnavailable/);
assert.match(component, /ov\.noVisits/);
assert.match(component, /ov\.viewDetailed/);
assert.match(component, /className="admin-sr-only"/, "screen-reader table alternative");
assert.match(component, /admin-bar-chart/);
assert.ok(!/useEffect|setInterval|fetch\(/.test(component), "no client API or polling");
assert.ok(!/sessionId|userAgent|ipAddress|postal/i.test(component), "component must not surface forbidden fields");

/* Overview page: guarded by canViewVisits so TREASURER never queries or sees it */
const page = read("src/app/admin/page.tsx");
assert.match(page, /canViewVisits\(roles\)/);
assert.match(page, /viewVisits \? loadOverviewSummary\(\) : Promise\.resolve\(null\)/);
assert.match(page, /visitsSummary \? <OverviewVisitsSummary summary=\{visitsSummary\} \/> : null/);

/* Guard itself excludes TREASURER */
const access = read("src/lib/access.ts");
const guardStart = access.indexOf("export function canViewVisits");
const guard = access.slice(guardStart, access.indexOf("\n}", guardStart));
assert.match(guard, /ApplicationRole\.SUPER_ADMIN/);
assert.match(guard, /ApplicationRole\.ADMIN/);
assert.ok(!guard.includes("TREASURER"), "canViewVisits must not grant visits to TREASURER");

/* Bilingual parity for the new component copy */
function collectKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => collectKeys(child, `${prefix}.${key}`))
    .sort();
}
assert.deepEqual(collectKeys(adminMessages.en.overview), collectKeys(adminMessages.es.overview));
assert.equal(adminMessages.en.overview.viewDetailed, "View detailed visits");
assert.equal(adminMessages.es.overview.viewDetailed.toLowerCase().includes("visitas"), true);
assert.ok(adminMessages.es.overview.geoUnavailable.length > 0);
assert.ok(collectKeys(adminMessages.en.overview).length >= 13);

/* Detail screen stays intact and non-redirecting */
const visits = read("src/app/admin/visits/page.tsx");
assert.match(visits, /export default async function VisitsPage/);
assert.match(visits, /VisitsDashboard/);
assert.match(visits, /isPublic: true/);
assert.match(visits, /resolveDateRange/);
assert.ok(!/permanentRedirect/.test(visits), "/admin/visits must not be redirected away");
assert.ok(!/redirect\("\/admin\/visits"\)/.test(visits), "/admin/visits must not redirect to itself");
assert.ok(!/redirect\("\/admin"\)/.test(visits), "/admin/visits must not redirect to the overview");

console.log("verify-admin-analytics-overview: all checks passed");
console.log("  - 30-day trailing window, daily series with zero-safe days");
console.log("  - Public-only Prisma aggregation; no IP/session/profile/user-agent/city/postal");
console.log("  - Overview summary guarded by canViewVisits (TREASURER excluded)");
console.log("  - Link to /admin/visits; EN/ES catalogue parity; /admin/visits unchanged");
