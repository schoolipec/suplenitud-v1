import {NextRequest, NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {supportedLocales} from "@/content/locale-copy";
import {hasSessionCookie, isBotUserAgent, isPublicPath} from "@/lib/analytics/filters";
import {isProxyTrusted, resolveClientIp} from "@/lib/analytics/privacy";
import {resolveGeoIp} from "@/lib/analytics/geo";

type AnalyticsPayload = {sessionId?: unknown; path?: unknown; locale?: unknown; referrer?: unknown; deviceType?: unknown};

function drop(): NextResponse {
  return new NextResponse(null, {status: 204});
}

export async function POST(request: NextRequest) {
  let body: AnalyticsPayload;
  try { body = await request.json() as AnalyticsPayload; } catch { return new NextResponse(null, {status: 400}); }
  if (typeof body.sessionId !== "string" || !/^[a-z0-9-]{16,64}$/i.test(body.sessionId) || typeof body.path !== "string" || !body.path.startsWith("/") || body.path.length > 500) return new NextResponse(null, {status: 400});
  // Public visits only: admin, api and internal routes are never persisted.
  if (!isPublicPath(body.path)) return drop();
  // Known bots are never persisted.
  if (isBotUserAgent(request.headers.get("user-agent"))) return drop();
  // Authenticated sessions (administrators included) are never counted.
  if (hasSessionCookie(request.headers.get("cookie"))) return drop();
  const locale = typeof body.locale === "string" && supportedLocales.includes(body.locale as (typeof supportedLocales)[number]) ? body.locale : "en";
  const referrer = typeof body.referrer === "string" && body.referrer.length <= 255 ? body.referrer : null;
  const deviceType = body.deviceType === "mobile" || body.deviceType === "desktop" ? body.deviceType : null;
  // The IP lives only in memory for this lookup and is discarded immediately.
  const clientIp = resolveClientIp(request.headers, isProxyTrusted());
  const geo = await resolveGeoIp(clientIp);
  try {
    await prisma.analyticsEvent.create({data: {sessionId: body.sessionId, path: body.path, locale, referrer, deviceType, isPublic: true, ...geo}});
  } catch { return drop(); }
  return drop();
}
