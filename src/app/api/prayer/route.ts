import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {notifyPrayerDelivery} from "@/lib/prayer-external-notifications";
import {notifyAdmins} from "@/lib/prayer-notifications";
import {validatePrayerRequest} from "@/lib/prayer-validation";
import {publicPrayerRequestsEnabled} from "@/lib/public-features";

export async function POST(request: Request) {
  if (!publicPrayerRequestsEnabled) {
    return NextResponse.json({error: "not_found"}, {status: 404});
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
    const superAdmin = await prisma.user.findFirst({
      where: {
        active: true,
        telegramChatId: {not: null},
        roles: {some: {role: "SUPER_ADMIN"}},
      },
      orderBy: {createdAt: "asc"},
      select: {telegramChatId: true},
    });
    await notifyPrayerDelivery({
      id: created.id,
      name,
      message,
      createdAt: created.createdAt,
      telegramChatId: superAdmin?.telegramChatId ?? null,
    });
  } catch {
    // External delivery must never block storage or the visitor response.
  }

  return NextResponse.json({id: created.id, status: created.status}, {status: 201});
}
