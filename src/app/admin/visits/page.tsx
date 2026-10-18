import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewVisits} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {VisitsDashboard, type VisitsAggregate} from "@/components/admin/VisitsDashboard";
import {resolveDateRange} from "@/lib/analytics/range";
import {isGeoAvailable} from "@/lib/analytics/geo";

export const instant = false;
export const metadata = {title: "Visits | Iglesia Plenitud en Cristo"};

function toRows(rows: {label: string | null; count: number}[], fallback: string): {label: string; count: number}[] {
  return rows
    .filter((row) => row.label !== null && row.label !== "")
    .map((row) => ({label: row.label ?? fallback, count: row.count}));
}

export default async function VisitsPage({searchParams}: {searchParams: Promise<{from?: string; to?: string}>}) {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true, roles: {select: {role: true}}}});
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canViewVisits(roles)) redirect("/admin/sign-in?error=unauthorized");

  const params = await searchParams;
  const range = resolveDateRange({from: params.from, to: params.to});
  const where = {isPublic: true, occurredAt: {gte: range.from, lte: range.to}};

  const [pageViews, sessionGroups, pages, countries, states, locales, devices, referrers] = await Promise.all([
    prisma.analyticsEvent.count({where}),
    prisma.analyticsEvent.groupBy({by: ["sessionId"], where}),
    prisma.analyticsEvent.groupBy({by: ["path"], where, _count: {_all: true}, orderBy: {_count: {path: "desc"}}, take: 10}),
    prisma.analyticsEvent.groupBy({by: ["countryCode", "countryName"], where, _count: {_all: true}, orderBy: {_count: {countryCode: "desc"}}, take: 10}),
    prisma.analyticsEvent.groupBy({by: ["regionCode", "regionName"], where: {...where, countryCode: "US", regionCode: {not: null}}, _count: {_all: true}, orderBy: {_count: {regionCode: "desc"}}, take: 10}),
    prisma.analyticsEvent.groupBy({by: ["locale"], where, _count: {_all: true}, orderBy: {_count: {locale: "desc"}}}),
    prisma.analyticsEvent.groupBy({by: ["deviceType"], where, _count: {_all: true}, orderBy: {_count: {deviceType: "desc"}}}),
    prisma.analyticsEvent.groupBy({by: ["referrer"], where: {...where, referrer: {not: null}}, _count: {_all: true}, orderBy: {_count: {referrer: "desc"}}, take: 10}),
  ]);

  const data: VisitsAggregate = {
    pageViews,
    uniqueSessions: sessionGroups.length,
    fromInput: range.fromInput,
    toInput: range.toInput,
    geoAvailable: isGeoAvailable(),
    topPages: toRows(pages.map((row) => ({label: row.path, count: row._count._all})), "Unknown page"),
    countries: countries
      .filter((row) => row.countryCode)
      .map((row) => ({label: row.countryName ? `${row.countryName} (${row.countryCode})` : row.countryCode!, count: row._count._all})),
    usStates: states
      .filter((row) => row.regionCode)
      .map((row) => ({label: row.regionName ? `${row.regionName} (${row.regionCode})` : row.regionCode!, count: row._count._all})),
    locales: toRows(locales.map((row) => ({label: row.locale, count: row._count._all})), "Unknown"),
    devices: devices
      .filter((row) => row.deviceType)
      .map((row) => ({label: row.deviceType === "mobile" ? "Mobile" : "Desktop", count: row._count._all})),
    referrers: referrers
      .filter((row) => row.referrer)
      .map((row) => ({label: row.referrer!, count: row._count._all})),
  };

  return (
    <AdminFrame roles={roles}>
      <VisitsDashboard data={data} />
    </AdminFrame>
  );
}
