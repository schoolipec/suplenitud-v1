import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {ProfileSettings} from "@/components/admin/ProfileSettings";

export const instant = false;
export const metadata = {title: "Settings | Iglesia Plenitud en Cristo"};

export default async function ConfigsPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      telegramChatId: true,
      twoFactorEnabled: true,
      active: true,
      mustChangePassword: true,
      roles: {select: {role: true}},
    },
  });
  if (!user?.active) redirect("/admin/sign-in?error=deactivated");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const roles = user.roles.map(({role}) => role);
  if (!canAccessAdmin(roles)) redirect("/admin/sign-in?error=unauthorized");
  return (
    <AdminFrame roles={roles} title="Settings">
      <div className="admin-settings-layout">
        <ProfileSettings
          profile={{
            name: user.name,
            email: user.email,
            phone: user.phone,
            whatsapp: user.whatsapp,
            telegramChatId: user.telegramChatId,
            twoFactorEnabled: user.twoFactorEnabled,
            roles,
          }}
        />
      </div>
    </AdminFrame>
  );
}
