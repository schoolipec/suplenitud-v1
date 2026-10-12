import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin, canManageDonations, canManageUsers, canViewContent, canViewPrayerRequests} from "@/lib/access";
import {prisma} from "@/lib/db/client";
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
  const manageUsers = canManageUsers(roles);
  const manageDonations = canManageDonations(roles);
  const viewPrayer = canViewPrayerRequests(roles);
  const viewContent = canViewContent(roles);
  const [auditEvents, userCount, requestCount, contentCount] = await Promise.all([
    manageUsers ? prisma.auditLog.findMany({orderBy: {createdAt: "desc"}, take: 6, select: {action: true, resource: true, createdAt: true}}) : [],
    manageUsers ? prisma.user.count() : 0,
    viewPrayer ? prisma.prayerRequest.count() : 0,
    viewContent ? prisma.contentBlock.count() : 0,
  ]);

  return <AdminFrame roles={roles} title={`Welcome, ${session.user.name}`}><p className="admin-intro">Your access level: {roles.join(", ")}. Use the modules below to manage the platform.</p><div className="admin-summary-grid">{manageUsers ? <Link href="/admin/users" className="admin-summary-card"><span>Users</span><strong>{userCount}</strong><small>Accounts and access</small></Link> : manageDonations ? <Link href="/admin/donations" className="admin-summary-card"><span>Donations</span><strong>›</strong><small>Reconciliation and payments</small></Link> : null}{viewPrayer ? <Link href="/admin/prayer-requests" className="admin-summary-card"><span>Prayer requests</span><strong>{requestCount}</strong><small>Pastoral follow-up</small></Link> : null}{viewContent ? <Link href="/admin/template" className="admin-summary-card"><span>Website content</span><strong>{contentCount}</strong><small>Blocks and translations</small></Link> : null}<Link href="/admin/configs" className="admin-summary-card"><span>Settings</span><strong>›</strong><small>Profile and security</small></Link></div>{manageUsers ? <section className="admin-section"><h2>Recent activity</h2>{auditEvents.length ? <ul className="admin-audit-list">{auditEvents.map((event) => <li key={`${event.action}-${event.createdAt.toISOString()}`}><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.resource} · {event.createdAt.toLocaleString("en-US")}</span></li>)}</ul> : <p>No recent activity.</p>}</section> : null}</AdminFrame>;
}
