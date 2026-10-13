import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canManageMinistryContacts} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {MinistryContactsManager} from "@/components/admin/MinistryContactsManager";

export const instant = false;
export const metadata = {title: "Ministry contacts | Iglesia Plenitud en Cristo"};

export default async function MinistryContactsPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {active: true, mustChangePassword: true, roles: {select: {role: true}}},
  });
  if (!user?.active) redirect("/admin/sign-in?error=deactivated");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const roles = user.roles.map(({role}) => role);
  if (!canManageMinistryContacts(roles)) redirect("/admin?error=unauthorized");
  const contacts = await prisma.ministryContact.findMany({orderBy: {createdAt: "asc"}});
  const initialContacts = contacts.map((contact) => ({...contact, createdAt: contact.createdAt.toISOString()}));
  return (
    <AdminFrame roles={roles} title="Ministry contacts">
      <MinistryContactsManager initialContacts={initialContacts} />
    </AdminFrame>
  );
}
