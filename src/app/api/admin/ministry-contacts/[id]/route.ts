import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";

type Params = {params: Promise<{id: string}>};

function cleanOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function PATCH(request: Request, {params}: Params) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const {id} = await params;
  const target = await prisma.ministryContact.findUnique({where: {id}, select: {id: true}});
  if (!target) return NextResponse.json({error: "contact_not_found"}, {status: 404});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, ministry, phone, whatsapp, telegramChatId, locale, timezone, authorized, active, notes} = body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) {
      return NextResponse.json({error: "invalid_name"}, {status: 400});
    }
    data.name = name.trim();
  }
  if (ministry !== undefined) {
    if (typeof ministry !== "string" || ministry.trim().length < 2 || ministry.trim().length > 60) {
      return NextResponse.json({error: "invalid_ministry"}, {status: 400});
    }
    data.ministry = ministry.trim();
  }
  const phoneUpdate = cleanOptionalString(phone);
  if (phoneUpdate !== undefined) data.phone = phoneUpdate;
  const whatsappUpdate = cleanOptionalString(whatsapp);
  if (whatsappUpdate !== undefined) data.whatsapp = whatsappUpdate;
  const telegramUpdate = cleanOptionalString(telegramChatId);
  if (telegramUpdate !== undefined) data.telegramChatId = telegramUpdate;
  if (locale !== undefined) {
    if (typeof locale !== "string" || locale.trim().length < 2 || locale.trim().length > 5) {
      return NextResponse.json({error: "invalid_locale"}, {status: 400});
    }
    data.locale = locale.trim();
  }
  if (timezone !== undefined) {
    if (typeof timezone !== "string" || timezone.trim().length < 2 || timezone.trim().length > 80) {
      return NextResponse.json({error: "invalid_timezone"}, {status: 400});
    }
    data.timezone = timezone.trim();
  }
  if (authorized !== undefined) {
    if (typeof authorized !== "boolean") return NextResponse.json({error: "invalid_authorized"}, {status: 400});
    data.authorized = authorized;
  }
  if (active !== undefined) {
    if (typeof active !== "boolean") return NextResponse.json({error: "invalid_active"}, {status: 400});
    data.active = active;
  }
  const notesUpdate = cleanOptionalString(notes);
  if (notesUpdate !== undefined) {
    if (notesUpdate !== null && notesUpdate.length > 2000) {
      return NextResponse.json({error: "invalid_notes"}, {status: 400});
    }
    data.notes = notesUpdate;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({error: "no_changes"}, {status: 400});

  const updated = await prisma.ministryContact.update({where: {id: target.id}, data});
  await prisma.auditLog.create({
    data: {actorUserId: actor.id, action: "MINISTRY_CONTACT_UPDATED", resource: "ministry_contact", resourceId: target.id, metadata: {fields: Object.keys(data)}},
  });

  return NextResponse.json({contact: updated});
}
