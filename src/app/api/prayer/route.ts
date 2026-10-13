import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {validatePrayerRequest} from "@/lib/prayer-validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({error: "invalid_request"}, {status: 400});
  }

  const validation = validatePrayerRequest(body);
  if (!validation.valid) {
    return NextResponse.json({error: "validation_failed", details: validation.errors}, {status: 400});
  }

  const {
    requestType,
    message,
    name,
    email,
    consentToStore,
    consentToContact,
    country,
    contactChannel,
    phone,
    whatsapp,
    timeZone,
    availabilitySlotId,
  } = body as {
    requestType: "PRAYER_ONLY" | "PRAYER_AND_CONTACT";
    message: string;
    name: string;
    email?: string;
    consentToStore: boolean;
    consentToContact?: boolean;
    country?: string;
    contactChannel?: "PHONE" | "WHATSAPP";
    phone?: string;
    whatsapp?: string;
    timeZone?: string;
    availabilitySlotId?: string;
  };

  const status = requestType === "PRAYER_AND_CONTACT" && !availabilitySlotId ? "PENDING_ASSIGNMENT" : "NEW";

  const created = await prisma.prayerRequest.create({
    data: {
      name: name.trim(),
      message: message.trim(),
      email: email?.trim() || null,
      requestType,
      country: country || null,
      contactChannel: contactChannel || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      timeZone: timeZone || null,
      availabilitySlotId: availabilitySlotId || null,
      consentToStore,
      consentToContact: consentToContact ?? false,
      status,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "PRAYER_REQUEST_CREATED",
      resource: "prayer_request",
      resourceId: created.id,
      metadata: {requestType, status},
    },
  });

  return NextResponse.json({id: created.id, status: created.status}, {status: 201});
}
