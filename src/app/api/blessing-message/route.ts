import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {supportedLocales} from "@/content/locale-copy";
import {blessingPriorityOverrideThreshold, fallbackVerses, selectDailyIndex} from "@/lib/blessing/daily-verse";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale") ?? "en";
  const locale = supportedLocales.includes(requestedLocale as (typeof supportedLocales)[number]) ? requestedLocale : "en";
  const fallback = fallbackVerses[locale] ?? fallbackVerses.en;

  try {
    const now = new Date();

    // 1. Mensajes administrativos con prioridad estrictamente superior al umbral prevalecen.
    const priorityMessage = await prisma.blessingMessage.findFirst({
      where: {
        active: true,
        priority: {gt: blessingPriorityOverrideThreshold},
        OR: [{publishedAt: null}, {publishedAt: {lte: now}}]
      },
      orderBy: [{priority: "desc"}, {publishedAt: "desc"}],
      include: {translations: {where: {locale: {in: [locale, "en"]}}}}
    });

    if (priorityMessage) {
      const translation = priorityMessage.translations.find((t) => t.locale === locale) ?? priorityMessage.translations.find((t) => t.locale === "en");
      if (translation) {
        return NextResponse.json({title: translation.title, body: translation.body, reference: translation.scriptureReference});
      }
    }

    // 2. Rotacion diaria: el indice se calcula con el dia UTC, no con la hora local.
    const activeMessages = await prisma.blessingMessage.findMany({
      where: {active: true, OR: [{publishedAt: null}, {publishedAt: {lte: now}}]},
      orderBy: [{priority: "desc"}, {createdAt: "asc"}],
      include: {translations: {where: {locale: {in: [locale, "en"]}}}}
    });

    const selectedIndex = selectDailyIndex(now, activeMessages.length);
    if (selectedIndex >= 0) {
      const selectedMessage = activeMessages[selectedIndex];
      const translation = selectedMessage.translations.find((t) => t.locale === locale) ?? selectedMessage.translations.find((t) => t.locale === "en");
      if (translation) {
        return NextResponse.json({title: translation.title, body: translation.body, reference: translation.scriptureReference});
      }
    }

    return NextResponse.json(fallback);
  } catch {
    // Sin base de datos o con error de consulta, se entrega el respaldo localizado (nunca 500).
    return NextResponse.json(fallback);
  }
}
