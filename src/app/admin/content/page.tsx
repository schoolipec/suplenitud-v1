import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewContent} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";

export const instant = false;
export const metadata = {title: "Website content | Iglesia Plenitud en Cristo"};

export default async function AdminContentPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true, roles: {select: {role: true}}}});
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canViewContent(roles)) redirect("/admin/sign-in?error=unauthorized");
  const blocks = await prisma.contentBlock.findMany({orderBy: [{displayOrder: "asc"}, {key: "asc"}], select: {id: true, key: true, type: true, status: true, translations: {select: {locale: true}}}});
  return <AdminFrame roles={roles} title="Website content"><p className="admin-intro">Published content is controlled by locale and revision. Editing is enabled after the first blocks are imported.</p><div className="admin-data-grid"><section className="admin-section"><h2>Content blocks</h2><ul className="admin-audit-list">{blocks.map((block) => <li key={block.id}><strong>{block.key}</strong><span>{block.type} · {block.status} · {block.translations.map(({locale}) => locale).join(", ") || "No translations"}</span></li>)}</ul></section></div></AdminFrame>;
}
