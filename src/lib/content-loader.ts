import {prisma} from "@/lib/db/client";
import {CONTENT_CATALOG} from "@/lib/content-catalog";
import {findMissingLocales, parseTranslationContent} from "@/lib/content-document";

export type ContentAdminTranslation = {locale: string; source: string; updatedAt: string};

export type ContentAdminRevision = {
  id: string;
  locale: string;
  action: string;
  createdBy: string;
  createdAt: string;
  source: string;
};

export type ContentAdminBlock = {
  id: string;
  key: string;
  type: string;
  displayOrder: number;
  status: "DRAFT" | "PUBLISHED";
  label: string;
  description: string;
  catalogued: boolean;
  missingLocales: string[];
  publishedLocales: string[];
  drafts: ContentAdminTranslation[];
  published: ContentAdminTranslation[];
  revisions: ContentAdminRevision[];
};

function sourceOf(value: unknown): string | null {
  const parsed = parseTranslationContent(value);
  return parsed.ok ? parsed.source : null;
}

/** Full editorial state: drafts for editing, published flags for the live view. */
export async function loadContentAdmin(): Promise<ContentAdminBlock[]> {
  const [blocks, revisions, authors] = await Promise.all([
    prisma.contentBlock.findMany({
      orderBy: [{displayOrder: "asc"}, {key: "asc"}],
      select: {id: true, key: true, type: true, displayOrder: true, status: true, translations: true},
    }),
    prisma.contentRevision.findMany({orderBy: {createdAt: "desc"}, take: 400}),
    prisma.user.findMany({select: {id: true, name: true}}),
  ]);
  const authorNames = new Map(authors.map((author) => [author.id, author.name]));
  return blocks.map((block) => {
    const catalog = CONTENT_CATALOG.find((entry) => entry.key === block.key);
    const drafts: ContentAdminTranslation[] = [];
    const published: ContentAdminTranslation[] = [];
    const publishedLocales: string[] = [];
    for (const translation of block.translations) {
      const draftSource = sourceOf(translation.draft);
      if (draftSource !== null) {
        drafts.push({locale: translation.locale, source: draftSource, updatedAt: translation.updatedAt.toISOString()});
      }
      const publishedSource = sourceOf(translation.published);
      if (publishedSource !== null) {
        published.push({locale: translation.locale, source: publishedSource, updatedAt: translation.updatedAt.toISOString()});
        publishedLocales.push(translation.locale);
      }
    }
    return {
      id: block.id,
      key: block.key,
      type: block.type,
      displayOrder: block.displayOrder,
      status: block.status,
      label: catalog?.label ?? block.key,
      description: catalog?.description ?? "Legacy key preserved. New keys are never created from the UI.",
      catalogued: Boolean(catalog),
      missingLocales: [...findMissingLocales(block.translations.map((translation) => ({locale: translation.locale, content: translation.draft})))],
      publishedLocales,
      drafts,
      published,
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
            createdAt: new Date(revision.createdAt).toISOString(),
            source,
          };
        }),
    };
  });
}
