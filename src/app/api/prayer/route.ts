import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {validatePrayerRequest} from "@/lib/prayer-validation";
import {isUuid, validateAvailabilitySlotForChannel} from "@/lib/prayer-availability";
import {notifyAdmins} from "@/lib/prayer-notifications";
import {publicPrayerRequestsEnabled} from "@/lib/public-features";

export async function POST(request: Request) {
  if (!publicPrayerRequestsEnabled) {
    return NextResponse.json({error: "not_found"}, {status: 404});
  }
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

  // When a slot is offered it must be the real UsherAvailability UUID and pass
  // server-side checks: exists, active, contact active/authorized, channel-compatible.
  let slotId: string | null = null;
  if (requestType === "PRAYER_AND_CONTACT" && availabilitySlotId) {
    if (!isUuid(availabilitySlotId)) {
      return NextResponse.json({error: "invalid_availability_slot"}, {status: 400});
    }
    const slot = await prisma.usherAvailability.findUnique({
      where: {id: availabilitySlotId},
      select: {
        id: true,
        active: true,
        contact: {select: {active: true, authorized: true, phone: true, whatsapp: true}},
      },
    });
    const check = validateAvailabilitySlotForChannel(
      slot && slot.contact
        ? {active: slot.active, contactActive: slot.contact.active, contactAuthorized: slot.contact.authorized, contactPhone: slot.contact.phone, contactWhatsapp: slot.contact.whatsapp}
        : null,
      contactChannel ?? "WHATSAPP",
    );
    if (!check.ok) {
      return NextResponse.json({error: "invalid_availability_slot", reason: check.reason}, {status: 400});
    }
    slotId = slot!.id;
  }

  // No compatible schedule chosen: keep the request as pending assignment
  // without promising immediate contact.
  const status = requestType === "PRAYER_AND_CONTACT" && !slotId ? "PENDING_ASSIGNMENT" : "NEW";

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
      availabilitySlotId: slotId,
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
      metadata: {requestType, status, hasSlot: Boolean(slotId)},
    },
  });

  try {
    const requester = name.trim().slice(0, 80);
    await notifyAdmins({type: "NEW_PRAYER_REQUEST", requestId: created.id, title: `New prayer request from ${requester}`});
    if (requestType === "PRAYER_AND_CONTACT") {
      await notifyAdmins({type: "NEW_CONTACT_REQUEST", requestId: created.id, title: `New contact request from ${requester}`});
      if (status === "PENDING_ASSIGNMENT") {
        await notifyAdmins({type: "PENDING_ASSIGNMENT", requestId: created.id, title: `Contact request pending assignment from ${requester}`});
      }
    }
  } catch {
    // Internal alerts must never break the public request flow.
  }

  return NextResponse.json({id: created.id, status: created.status}, {status: 201});
}
