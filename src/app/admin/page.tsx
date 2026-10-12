import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {canManageUsers} from "@/lib/access";
import Link from "next/link";
import {AdminFrame} from "@/components/admin/AdminFrame";

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
  const [auditEvents, userCount, requestCount, contentCount] = await Promise.all([
    canManageUsers(roles) ? prisma.auditLog.findMany({orderBy: {createdAt: "desc"}, take: 6, select: {action: true, resource: true, createdAt: true}}) : [],
    canManageUsers(roles) ? prisma.user.count() : 0,
    prisma.prayerRequest.count(),
    prisma.contentBlock.count(),
  ]);

  return <AdminFrame roles={roles} title={`Welcome, ${session.user.name}`}><p className="admin-intro">Your access level: {roles.join(", ")}. Use the modules below to manage the platform.</p><div className="admin-summary-grid"><Link href="/admin/users" className="admin-summary-card"><span>Users</span><strong>{userCount}</strong><small>Accounts and access</small></Link><Link href="/admin/prayer-requests" className="admin-summary-card"><span>Prayer requests</span><strong>{requestCount}</strong><small>Pastoral follow-up</small></Link><Link href="/admin/template" className="admin-summary-card"><span>Website content</span><strong>{contentCount}</strong><small>Blocks and translations</small></Link><Link href="/admin/configs" className="admin-summary-card"><span>Settings</span><strong>›</strong><small>Profile and security</small></Link></div><section className="admin-section"><h2>Recent activity</h2>{auditEvents.length ? <ul className="admin-audit-list">{auditEvents.map((event) => <li key={`${event.action}-${event.createdAt.toISOString()}`}><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.resource} · {event.createdAt.toLocaleString("en-US")}</span></li>)}</ul> : <p>No recent activity.</p>}</section></AdminFrame>;
}
