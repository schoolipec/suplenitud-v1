import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {supportedLocales} from "@/content/locale-copy";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale") ?? "en";
  const locale = supportedLocales.includes(requestedLocale as (typeof supportedLocales)[number]) ? requestedLocale : "en";

  try {
    const message = await prisma.blessingMessage.findFirst({
      where: {active: true, OR: [{publishedAt: null}, {publishedAt: {lte: new Date()}}]},
      orderBy: [{priority: "desc"}, {publishedAt: "desc"}],
      include: {translations: {where: {locale: {in: [locale, "en"]}}}}
    });
    const translation = message?.translations.find(({locale: translationLocale}) => translationLocale === locale) ?? message?.translations.find(({locale: translationLocale}) => translationLocale === "en");
    if (!translation) return new NextResponse(null, {status: 204});
    return NextResponse.json({title: translation.title, body: translation.body, reference: translation.scriptureReference});
  } catch {
    return new NextResponse(null, {status: 204});
  }
}
