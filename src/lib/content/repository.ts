import {prisma} from "@/lib/db/client";

const allowedLocales = new Set(["en", "es", "pt", "ko", "de"]);

/** Reads published, structured content without allowing database availability to break public pages. */
export async function getPublishedContent(key: string, locale: string) {
  if (!allowedLocales.has(locale)) return null;
  try {
    const block = await prisma.contentBlock.findFirst({
      where: {key, status: "PUBLISHED"},
      select: {translations: {where: {locale}, select: {content: true}}},
    });
    return block?.translations[0]?.content ?? null;
  } catch {
    return null;
  }
}
