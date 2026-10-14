import {prisma} from "@/lib/db/client";

const allowedLocales = new Set(["en", "es", "pt", "ko", "de"]);

/** Reads the published version only, without allowing database availability to break public pages. Drafts are never exposed here. */
export async function getPublishedContent(key: string, locale: string) {
  if (!allowedLocales.has(locale)) return null;
  try {
    const block = await prisma.contentBlock.findFirst({
      where: {key, status: "PUBLISHED"},
      select: {translations: {where: {locale}, select: {published: true}}},
    });
    return block?.translations[0]?.published ?? null;
  } catch {
    return null;
  }
}
