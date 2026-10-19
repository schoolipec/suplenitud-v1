import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {notifyPrayerDelivery} from "@/lib/prayer-external-notifications";
import {notifyAdmins} from "@/lib/prayer-notifications";
import {validatePrayerRequest} from "@/lib/prayer-validation";
import {publicPrayerRequestsEnabled} from "@/lib/public-features";
import {selectPrayerAlertRecipients} from "@/lib/prayer-recipients";
import {getAdminUrl} from "@/lib/admin-url";
import {checkRateLimit, getClientIp} from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!publicPrayerRequestsEnabled) {
    return NextResponse.json({error: "not_found"}, {status: 404});
  }

  // Rate limit: 5 requests per 15 minutes per IP
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`prayer:${ip}`, 5, 15 * 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {error: "rate_limit_exceeded", resetAt: rateLimit.resetAt.toISOString()},
      {
        status: 429,
        headers: {"Retry-After": Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString()},
      }
    );
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({error: "invalid_request"}, {status: 400});

  const validation = validatePrayerRequest(body);
  if (!validation.valid) {
    return NextResponse.json({error: "validation_failed", details: validation.errors}, {status: 400});
  }

  const name = String(body.name).trim();
  const message = String(body.message).trim();
  const created = await prisma.prayerRequest.create({
    data: {
      name,
      message,
      requestType: "PRAYER_ONLY",
      consentToStore: false,
      consentToContact: false,
      status: "NEW",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "PRAYER_REQUEST_CREATED",
      resource: "prayer_request",
      resourceId: created.id,
      metadata: {requestType: "PRAYER_ONLY", status: "NEW", source: "public_simple_form"},
    },
  });

  try {
    await notifyAdmins({type: "NEW_PRAYER_REQUEST", requestId: created.id, title: `New prayer request from ${name.slice(0, 80)}`});
  } catch {
    // Internal alerts must never block a prayer request.
  }

  try {
    const candidates = await prisma.user.findMany({
      where: {active: true, roles: {some: {role: {in: ["SUPER_ADMIN", "ADMIN"]}}}},
      select: {id: true, name: true, email: true, active: true, telegramChatId: true, prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: {select: {role: true}}},
    });
    const recipients = selectPrayerAlertRecipients(candidates);
    await notifyPrayerDelivery({
      id: created.id,
      name,
      message,
      createdAt: created.createdAt,
      telegramChatIds: recipients.telegramChatIds,
      emailCopyRecipients: recipients.emailCopyRecipients,
      adminUrl: getAdminUrl(),
    });
  } catch {
    // External delivery must never block storage or the visitor response.
  }

  return NextResponse.json({id: created.id, status: created.status}, {status: 201});
}
