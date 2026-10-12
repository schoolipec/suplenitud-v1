import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {canManageUsers} from "@/lib/access";
import {CreateAdminForm} from "@/components/admin/CreateAdminForm";
import Link from "next/link";

export const metadata = {title: "Administration | Iglesia Plenitud en Cristo"};
export const instant = false;

export default async function AdminPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const currentUser = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true}});
  if (currentUser?.mustChangePassword) redirect("/admin/change-password");

  const assignments = await prisma.userRole.findMany({
    where: {userId: session.user.id},
    select: {role: true},
  });
  const roles = assignments.map(({role}) => role);
  if (!canAccessAdmin(roles)) redirect("/admin/sign-in?error=unauthorized");
  const auditEvents = canManageUsers(roles) ? await prisma.auditLog.findMany({orderBy: {createdAt: "desc"}, take: 10, select: {action: true, resource: true, createdAt: true}}) : [];

  return (
    <main className="admin-shell" lang="en">
      <section className="admin-card" aria-labelledby="admin-title">
        <p className="admin-eyebrow">Administration</p>
        <h1 id="admin-title">Welcome, {session.user.name}</h1>
        <p>Your access level: {roles.join(", ")}</p>
        <p><Link className="password-recovery-link" href="/admin/security">Security and two-factor authentication</Link></p>
        <p>Content, prayer requests, and finance modules will appear here as their approved phases are completed.</p>
        {canManageUsers(roles) ? <CreateAdminForm /> : null}
        {canManageUsers(roles) ? <section className="admin-audit"><h2>Recent activity</h2><ul>{auditEvents.map((event) => <li key={`${event.action}-${event.createdAt.toISOString()}`}>{event.action} · {event.resource} · {event.createdAt.toLocaleString("en-US")}</li>)}</ul></section> : null}
      </section>
    </main>
  );
}
