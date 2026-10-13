import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewPrayerRequests} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {PrayerRequestsQueue} from "@/components/admin/PrayerRequestsQueue";

export const instant = false;
export const metadata = {title: "Prayer requests | Iglesia Plenitud en Cristo"};

export default async function PrayerRequestsPage() {
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

  const requests = await prisma.prayerRequest.findMany({
    orderBy: {createdAt: "desc"},
    take: 200,
    include: {
      assignments: {
        include: {
          contact: {
            select: {id: true, name: true, ministry: true, locale: true},
          },
        },
      },
    },
  });

  const initialRequests = requests.map((r) => ({
    ...r,
    contactChannel: r.contactChannel as "PHONE" | "WHATSAPP" | null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <AdminFrame roles={roles} title="Prayer requests">
      <PrayerRequestsQueue initialRequests={initialRequests} />
    </AdminFrame>
  );
}
