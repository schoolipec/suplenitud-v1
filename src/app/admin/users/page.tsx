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
  const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true, roles: {select: {role: true}}}});
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canManageUsers(roles)) redirect("/admin?error=unauthorized");
  const users = await prisma.user.findMany({orderBy: {createdAt: "asc"}, select: {id: true, name: true, email: true, createdAt: true, twoFactorEnabled: true, roles: {select: {role: true}}}});
  const initialUsers = users.map((item) => ({...item, createdAt: item.createdAt.toISOString(), roles: item.roles.map(({role}) => role)}));
  return <AdminFrame roles={roles} title="User management"><UserManagement initialUsers={initialUsers}/></AdminFrame>;
}
