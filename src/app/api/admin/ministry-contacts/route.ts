import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";

function cleanOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function GET(request: Request) {
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const contacts = await prisma.ministryContact.findMany({orderBy: {createdAt: "asc"}});
  return NextResponse.json({contacts});
}

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, ministry, phone, whatsapp, telegramChatId, locale, timezone, authorized, notes} = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) {
    return NextResponse.json({error: "invalid_name"}, {status: 400});
  }
  if (typeof ministry !== "string" || ministry.trim().length < 2 || ministry.trim().length > 60) {
    return NextResponse.json({error: "invalid_ministry"}, {status: 400});
  }
  const cleanPhone = cleanOptionalString(phone);
  const cleanWhatsapp = cleanOptionalString(whatsapp);
  const cleanTelegram = cleanOptionalString(telegramChatId);
  const cleanLocale = typeof locale === "string" && locale.trim().length >= 2 && locale.trim().length <= 5 ? locale.trim() : "en";
  const cleanTimezone = typeof timezone === "string" && timezone.trim().length >= 2 && timezone.trim().length <= 80 ? timezone.trim() : "America/Los_Angeles";
  const cleanNotes = cleanOptionalString(notes);
  if (cleanNotes !== undefined && cleanNotes !== null && cleanNotes.length > 2000) {
    return NextResponse.json({error: "invalid_notes"}, {status: 400});
  }

  const created = await prisma.ministryContact.create({
    data: {
      name: name.trim(),
      ministry: ministry.trim(),
      phone: cleanPhone ?? null,
      whatsapp: cleanWhatsapp ?? null,
      telegramChatId: cleanTelegram ?? null,
      locale: cleanLocale,
      timezone: cleanTimezone,
      authorized: authorized === true,
      notes: cleanNotes ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {actorUserId: actor.id, action: "MINISTRY_CONTACT_CREATED", resource: "ministry_contact", resourceId: created.id, metadata: {ministry: created.ministry}},
  });

  return NextResponse.json({contact: created}, {status: 201});
}
