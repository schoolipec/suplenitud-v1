import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";
export const instant = false;
export default async function PrayerRequestsPage() {
 const session = await auth.api.getSession({headers: await headers()}); if (!session?.user) redirect("/admin/sign-in");
 const roles=(await prisma.userRole.findMany({where:{userId:session.user.id},select:{role:true}})).map(({role})=>role); if(!canAccessAdmin(roles)) redirect("/admin/sign-in?error=unauthorized");
 const requests=await prisma.prayerRequest.findMany({orderBy:{createdAt:"desc"},take:50,select:{id:true,name:true,status:true,createdAt:true}});
 return <main className="admin-shell" lang="en"><section className="admin-card"><p className="admin-eyebrow">Administration</p><h1>Prayer requests</h1><ul>{requests.map((item)=><li key={item.id}><strong>{item.name}</strong> · {item.status} · {item.createdAt.toLocaleString("en-US")}</li>)}</ul></section></main>;
}
