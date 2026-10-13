import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canManageUsers} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {UserManagement} from "@/components/admin/UserManagement";

export const instant = false;
export const metadata = {title: "Users | Iglesia Plenitud en Cristo"};

export default async function UsersPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {active: true, mustChangePassword: true, roles: {select: {role: true}}},
  });
  if (!user?.active) redirect("/admin/sign-in?error=deactivated");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const roles = user.roles.map(({role}) => role);
  if (!canManageUsers(roles)) redirect("/admin?error=unauthorized");
  const users = await prisma.user.findMany({
    orderBy: {createdAt: "asc"},
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      active: true,
      twoFactorEnabled: true,
      roles: {select: {role: true}},
      sessions: {select: {updatedAt: true}, orderBy: {updatedAt: "desc"}, take: 1},
      invitations: {
        where: {usedAt: null, revokedAt: null},
        orderBy: {createdAt: "desc"},
        take: 1,
        select: {id: true, expiresAt: true, createdAt: true},
      },
    },
  });
  const initialUsers = users.map(({sessions, invitations, ...item}) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    roles: item.roles.map(({role}) => role),
    lastActivityAt: sessions[0]?.updatedAt.toISOString() ?? null,
    pendingInvitation: invitations[0]
      ? {
          id: invitations[0].id,
          expiresAt: invitations[0].expiresAt.toISOString(),
          createdAt: invitations[0].createdAt.toISOString(),
        }
      : null,
  }));
  return (
    <AdminFrame roles={roles} title="User management">
      <UserManagement initialUsers={initialUsers} currentUserId={session.user.id} />
    </AdminFrame>
  );
}
