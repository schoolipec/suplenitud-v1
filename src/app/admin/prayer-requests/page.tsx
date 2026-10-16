import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewPrayerRequests} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {PrayerRequestsQueue} from "@/components/admin/PrayerRequestsQueue";
import {parsePrayerFilters, prayerPageParams, prayerQueueWhere, PRAYER_QUEUE_SELECT} from "@/lib/prayer-queue";

export const instant = false;
export const metadata = {title: "Prayer requests | Iglesia Plenitud en Cristo"};

export default async function PrayerRequestsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {active: true, mustChangePassword: true, roles: {select: {role: true}}},
  });
  if (!user?.active) redirect("/admin/sign-in?error=deactivated");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const roles = user.roles.map(({role}) => role);
  if (!canViewPrayerRequests(roles)) redirect("/admin/sign-in?error=unauthorized");

  const parsed = parsePrayerFilters(prayerPageParams(await searchParams));
  if (!parsed.ok) return <AdminFrame roles={roles} title="Peticiones de oración"><p role="alert">Filtros inválidos. Revisa el estado, la búsqueda y las fechas.</p></AdminFrame>;
  const [requests, newCount] = await Promise.all([
    prisma.prayerRequest.findMany({
      where: prayerQueueWhere(parsed.filters), select: PRAYER_QUEUE_SELECT,
      orderBy: [{createdAt: "desc"}, {id: "desc"}],
    }),
    prisma.prayerRequest.count({where: {requestType: "PRAYER_ONLY", status: "NEW"}}),
  ]);

  const initialRequests = requests.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <AdminFrame roles={roles} title="Peticiones de oración">
      <PrayerRequestsQueue initialRequests={initialRequests} initialNewCount={newCount} initialFilters={parsed.filters} />
    </AdminFrame>
  );
}
