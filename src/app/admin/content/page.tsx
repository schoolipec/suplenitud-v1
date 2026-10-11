import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";

export const instant = false;
export default async function AdminContentPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const roles = (await prisma.userRole.findMany({where: {userId: session.user.id}, select: {role: true}})).map(({role}) => role);
  if (!canAccessAdmin(roles)) redirect("/admin/sign-in?error=unauthorized");
  const blocks = await prisma.contentBlock.findMany({orderBy: [{displayOrder: "asc"}, {key: "asc"}], select: {id: true, key: true, type: true, status: true, translations: {select: {locale: true}}}});
  return <main className="admin-shell" lang="en"><section className="admin-card"><p className="admin-eyebrow">Administration</p><h1>Content</h1><p>Published content is controlled by locale and revision. Editing is enabled after the first blocks are imported.</p><ul>{blocks.map((block) => <li key={block.id}><strong>{block.key}</strong> · {block.type} · {block.status} · {block.translations.map(({locale}) => locale).join(", ") || "No translations"}</li>)}</ul></section></main>;
}
