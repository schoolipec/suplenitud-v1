import {prisma} from "@/lib/db/client";
import {isGeoAvailable} from "@/lib/analytics/geo";
import {bucketByDay, overviewWindow, topEntry, type OverviewSummary} from "@/lib/analytics/summary";

/**
 * Server-only aggregate for the Overview executive summary.
 * Public events only; never selects IP, session details, profile, user agent,
 * city or postal data. Distinct sessions are counted, not exposed.
 */
export async function loadOverviewSummary(now: Date = new Date()): Promise<OverviewSummary> {
  const {from, to, days} = overviewWindow(now);
  const where = {isPublic: true, occurredAt: {gte: from, lte: to}};

  const [pageViews, sessionGroups, pageRows, countryRows, events] = await Promise.all([
    prisma.analyticsEvent.count({where}),
    prisma.analyticsEvent.groupBy({by: ["sessionId"], where}),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where,
      _count: {_all: true},
      orderBy: {_count: {path: "desc"}},
      take: 5,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["countryCode", "countryName"],
      where,
      _count: {_all: true},
      orderBy: {_count: {countryCode: "desc"}},
      take: 5,
    }),
    prisma.analyticsEvent.findMany({where, select: {occurredAt: true}}),
  ]);

  const geoAvailable = isGeoAvailable();

  return {
    pageViews,
    uniqueSessions: sessionGroups.length,
    topPage: topEntry(pageRows.map((row) => ({label: row.path, count: row._count._all}))),
    topCountry: geoAvailable
      ? topEntry(countryRows.map((row) => ({label: row.countryName ?? row.countryCode, count: row._count._all})))
      : null,
    geoAvailable,
    daily: bucketByDay(events, days),
    window: {from: days[0], to: days[days.length - 1]},
  };
}
