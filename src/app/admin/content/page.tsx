import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewContent} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {ContentManager} from "@/components/admin/ContentManager";
import {loadContentAdmin} from "@/lib/content-loader";
import type {ContentBlockData} from "@/lib/content-types";

export const instant = false;
export const metadata = {title: "Website content | Iglesia Plenitud en Cristo"};

function previewOf(source: string): string {
  const first = source.split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? "";
  return first.length > 120 ? `${first.slice(0, 120)}…` : first;
}

export default async function AdminContentPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true, roles: {select: {role: true}}}});
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canViewContent(roles)) redirect("/admin/sign-in?error=unauthorized");

  const blocks = await loadContentAdmin();
  const initialBlocks: ContentBlockData[] = blocks.map((block) => ({
    id: block.id,
    key: block.key,
    type: block.type,
    displayOrder: block.displayOrder,
    status: block.status,
    label: block.label,
    description: block.description,
    catalogued: block.catalogued,
    missingLocales: block.missingLocales,
    translations: block.drafts.map((draft) => ({locale: draft.locale, source: draft.source, updatedAt: draft.updatedAt})),
    published: block.published.map((entry) => ({locale: entry.locale, source: entry.source, updatedAt: entry.updatedAt})),
    revisions: block.revisions.map((revision) => ({
      id: revision.id,
      locale: revision.locale,
      action: revision.action,
      createdBy: revision.createdBy,
      createdAt: new Date(revision.createdAt).toLocaleString("en-US"),
      preview: revision.source ? previewOf(revision.source) : "Legacy snapshot",
    })),
  }));

  return (
    <AdminFrame roles={roles} title="Website content">
      <ContentManager initialBlocks={initialBlocks} />
    </AdminFrame>
  );
}
