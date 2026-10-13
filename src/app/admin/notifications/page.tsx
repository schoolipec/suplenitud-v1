import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewPrayerRequests} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {NotificationsList} from "@/components/admin/NotificationsList";

export const instant = false;
export const metadata = {title: "Notifications | Iglesia Plenitud en Cristo"};

export default async function NotificationsPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {active: true, mustChangePassword: true, roles: {select: {role: true}}},
  });
  if (!user?.active) redirect("/admin/sign-in?error=deactivated");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const roles = user.roles.map(({role}) => role);
  if (!canViewPrayerRequests(roles)) redirect("/admin?error=unauthorized");

  const [notifications, unreadCount] = await Promise.all([
    prisma.prayerNotification.findMany({
      where: {userId: session.user.id},
      orderBy: {createdAt: "desc"},
      take: 100,
      include: {request: {select: {id: true, name: true, status: true, requestType: true}}},
    }),
    prisma.prayerNotification.count({where: {userId: session.user.id, read: false}}),
  ]);

  const initial = notifications.map((n) => ({...n, createdAt: n.createdAt.toISOString()}));

  return (
    <AdminFrame roles={roles} title="Notifications">
      <NotificationsList initialNotifications={initial} initialUnread={unreadCount} />
    </AdminFrame>
  );
}
