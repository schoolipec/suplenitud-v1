import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";

export const instant = false;
export const metadata = {title: "Visits | Iglesia Plenitud en Cristo"};

export default async function VisitsPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true, roles: {select: {role: true}}}});
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canAccessAdmin(roles)) redirect("/admin/sign-in?error=unauthorized");
  const [total, paths, locales] = await Promise.all([prisma.analyticsEvent.count(), prisma.analyticsEvent.groupBy({by: ["path"], _count: {_all: true}, orderBy: {_count: {path: "desc"}}, take: 10}), prisma.analyticsEvent.groupBy({by: ["locale"], _count: {_all: true}, orderBy: {_count: {locale: "desc"}}})]);
  return <AdminFrame roles={roles} title="Visits"><p className="admin-intro">Privacy-respecting aggregate activity. Visitor records are not converted into personally identifiable profiles.</p><div className="admin-summary-grid"><div className="admin-summary-card"><span>Recorded events</span><strong>{total}</strong><small>Current retained analytics</small></div></div><div className="admin-data-grid"><section className="admin-section"><h2>Top pages</h2><ul className="admin-audit-list">{paths.map((row) => <li key={row.path}><strong>{row.path}</strong><span>{row._count._all} events</span></li>)}</ul></section><section className="admin-section"><h2>Languages</h2><ul className="admin-audit-list">{locales.map((row) => <li key={row.locale}><strong>{row.locale}</strong><span>{row._count._all} events</span></li>)}</ul></section></div></AdminFrame>;
}
