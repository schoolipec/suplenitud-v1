import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {supportedLocales} from "@/content/locale-copy";

type AnalyticsPayload = {sessionId?: unknown; path?: unknown; locale?: unknown; referrer?: unknown; deviceType?: unknown};

export async function POST(request: NextRequest) {
  let body: AnalyticsPayload;
  try { body = await request.json() as AnalyticsPayload; } catch { return new NextResponse(null, {status: 400}); }
  if (typeof body.sessionId !== "string" || !/^[a-z0-9-]{16,64}$/i.test(body.sessionId) || typeof body.path !== "string" || !body.path.startsWith("/") || body.path.length > 500) return new NextResponse(null, {status: 400});
  const locale = typeof body.locale === "string" && supportedLocales.includes(body.locale as (typeof supportedLocales)[number]) ? body.locale : "en";
  const referrer = typeof body.referrer === "string" && body.referrer.length <= 255 ? body.referrer : null;
  const deviceType = body.deviceType === "mobile" || body.deviceType === "desktop" ? body.deviceType : null;
  try {
    await prisma.analyticsEvent.create({data: {sessionId: body.sessionId, path: body.path, locale, referrer, deviceType}});
  } catch { return new NextResponse(null, {status: 204}); }
  return new NextResponse(null, {status: 204});
}
