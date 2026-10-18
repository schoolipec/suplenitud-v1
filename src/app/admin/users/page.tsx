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
  return <AdminFrame roles={roles}><UserManagement initialUsers={[]} currentUserId={session.user.id} /></AdminFrame>;
}