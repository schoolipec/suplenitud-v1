import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewContent} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {ContentManager} from "@/components/admin/ContentManager";
import {CONTENT_CATALOG} from "@/lib/content-catalog";
import {findMissingLocales, parseTranslationContent} from "@/lib/content-document";
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

  const [blocks, revisions, authors] = await Promise.all([
    prisma.contentBlock.findMany({
      orderBy: [{displayOrder: "asc"}, {key: "asc"}],
      select: {id: true, key: true, type: true, displayOrder: true, status: true, translations: true},
    }),
    prisma.contentRevision.findMany({orderBy: {createdAt: "desc"}, take: 200}),
    prisma.user.findMany({select: {id: true, name: true}}),
  ]);
  const authorNames = new Map(authors.map((author) => [author.id, author.name]));

  const initialBlocks: ContentBlockData[] = blocks.map((block) => {
    const catalog = CONTENT_CATALOG.find((entry) => entry.key === block.key);
    const translations = block.translations.flatMap((translation) => {
      const parsed = parseTranslationContent(translation.content);
      if (!parsed.ok || !parsed.source) return [];
      return [{locale: translation.locale, source: parsed.source, updatedAt: translation.updatedAt.toISOString()}];
    });
    const missingLocales = findMissingLocales(
      block.translations.map((translation) => ({locale: translation.locale, content: translation.content})),
    );
    return {
      id: block.id,
      key: block.key,
      type: block.type,
      displayOrder: block.displayOrder,
      status: block.status,
      label: catalog?.label ?? block.key,
      description: catalog?.description ?? "Legacy key preserved. New keys are never created from the UI.",
      catalogued: Boolean(catalog),
      missingLocales: [...missingLocales],
      translations,
      revisions: revisions
        .filter((revision) => revision.blockId === block.id)
        .slice(0, 20)
        .map((revision) => {
          const snapshot = (revision.snapshot ?? {}) as Record<string, unknown>;
          const source = typeof snapshot.source === "string" ? snapshot.source : "";
          return {
            id: revision.id,
            locale: revision.locale ?? (typeof snapshot.locale === "string" ? snapshot.locale : "—"),
            action: revision.action ?? "saved",
            createdBy: revision.createdById ? (authorNames.get(revision.createdById) ?? "Former member") : "System",
            createdAt: new Date(revision.createdAt).toLocaleString("en-US"),
            preview: source ? previewOf(source) : "Legacy snapshot",
          };
        }),
    };
  });

  return (
    <AdminFrame roles={roles} title="Website content">
      <ContentManager initialBlocks={initialBlocks} />
    </AdminFrame>
  );
}
