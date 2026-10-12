import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
export const instant = false;
export const metadata = {title: "Prayer requests | Iglesia Plenitud en Cristo"};
export default async function PrayerRequestsPage() {
 const session = await auth.api.getSession({headers: await headers()}); if (!session?.user) redirect("/admin/sign-in");
 const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true, roles: {select: {role: true}}}});
 if (user?.mustChangePassword) redirect("/admin/change-password");
 const roles = user?.roles.map(({role}) => role) ?? []; if(!canAccessAdmin(roles))redirect("/admin/sign-in?error=unauthorized");
 const requests=await prisma.prayerRequest.findMany({orderBy:{createdAt:"desc"},take:50,select:{id:true,name:true,status:true,createdAt:true}});
 return <AdminFrame roles={roles} title="Prayer requests"><p className="admin-intro">Pastoral follow-up queue. Telegram and WhatsApp notifications remain disabled until authorized.</p><div className="admin-data-grid"><section className="admin-section"><h2>Recent requests</h2><ul className="admin-audit-list">{requests.map((item)=><li key={item.id}><strong>{item.name}</strong><span>{item.status} · {item.createdAt.toLocaleString("en-US")}</span></li>)}</ul></section></div></AdminFrame>;
}
