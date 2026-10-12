import Link from "next/link";
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
  const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {name: true, email: true, phone: true, whatsapp: true, telegramChatId: true, mustChangePassword: true, roles: {select: {role: true}}}});
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canAccessAdmin(roles)) redirect("/admin/sign-in?error=unauthorized");
  if (!user) redirect("/admin/sign-in");
  return <AdminFrame roles={roles} title="Settings"><div className="admin-settings-grid"><section className="admin-section"><h2>Your profile</h2><ProfileSettings profile={user}/></section><section className="admin-section"><h2>Security</h2><p>Set up or review two-factor authentication for this account.</p><Link className="admin-action-link" href="/admin/security">Open security settings</Link></section><section className="admin-section"><h2>Email templates</h2><p>Institutional email templates will be managed separately from website content, with safe HTML and preview before sending.</p><p className="admin-field-note">This module is planned; no email will be sent from this screen.</p></section></div></AdminFrame>;
}
