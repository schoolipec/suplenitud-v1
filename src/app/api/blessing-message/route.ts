import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {supportedLocales} from "@/content/locale-copy";

const fallbackVerses: Record<string, {title: string; body: string; reference: string}> = {
  es: {
    title: "Una palabra para ti",
    body: "El Señor está cerca de todos los que lo invocan de verdad.",
    reference: "Salmo 145:18"
  },
  en: {
    title: "A word for you",
    body: "The Lord is close to all who call on Him in truth.",
    reference: "Psalm 145:18"
  },
  pt: {
    title: "Uma palavra para você",
    body: "O Senhor está perto de todos os que o invocam em verdade.",
    reference: "Salmo 145:18"
  },
  ko: {
    title: "당신을 위한 말씀",
    body: "여호와께서는 진실하게 부르는 모든 자에게 가까이 계십니다.",
    reference: "시편 145:18"
  },
  de: {
    title: "Ein Wort für dich",
    body: "Der Herr ist allen nahe, die ihn in Wahrheit anrufen.",
    reference: "Psalm 145,18"
  }
};

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale") ?? "en";
  const locale = supportedLocales.includes(requestedLocale as (typeof supportedLocales)[number]) ? requestedLocale : "en";
  const fallback = fallbackVerses[locale] ?? fallbackVerses.en;

  try {
    // 1. High priority broadcasts (priority > 50) take immediate precedence
    const priorityMessage = await prisma.blessingMessage.findFirst({
      where: {active: true, priority: {gt: 50}, OR: [{publishedAt: null}, {publishedAt: {lte: new Date()}}]},
      orderBy: [{priority: "desc"}, {publishedAt: "desc"}],
      include: {translations: {where: {locale: {in: [locale, "en"]}}}}
    });

    if (priorityMessage) {
      const translation = priorityMessage.translations.find((t) => t.locale === locale) ?? priorityMessage.translations.find((t) => t.locale === "en");
      if (translation) {
        return NextResponse.json({title: translation.title, body: translation.body, reference: translation.scriptureReference});
      }
    }

    // 2. Select verse of the day deterministically by calendar day of the year
    const activeMessages = await prisma.blessingMessage.findMany({
      where: {active: true, OR: [{publishedAt: null}, {publishedAt: {lte: new Date()}}]},
      orderBy: [{priority: "desc"}, {createdAt: "asc"}],
      include: {translations: {where: {locale: {in: [locale, "en"]}}}}
    });

    if (activeMessages.length > 0) {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 0);
      const diff = Number(now) - Number(startOfYear);
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
      const selectedMessage = activeMessages[dayOfYear % activeMessages.length];
      const translation = selectedMessage.translations.find((t) => t.locale === locale) ?? selectedMessage.translations.find((t) => t.locale === "en");
      if (translation) {
        return NextResponse.json({title: translation.title, body: translation.body, reference: translation.scriptureReference});
      }
    }

    return NextResponse.json(fallback);
  } catch {
    return NextResponse.json(fallback);
  }
}
