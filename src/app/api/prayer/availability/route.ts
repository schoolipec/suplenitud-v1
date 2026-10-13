import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {isValidCountryCode, isValidContactChannel, isValidTimeZone} from "@/lib/prayer-validation";
import {buildPublicSlot, isSlotCompatibleWithChannel, type PublicAvailabilitySlot} from "@/lib/prayer-availability";

/**
 * Public availability lookup. Returns only safe, non-identifying slot data:
 * the real UsherAvailability UUID plus a label already converted to the
 * visitor's time zone. Never exposes contact names, phones, channels or ids.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const timeZone = url.searchParams.get("timeZone");
  const country = url.searchParams.get("country");
  const channelParam = url.searchParams.get("channel");

  if (!timeZone || !isValidTimeZone(timeZone)) {
    return NextResponse.json({error: "invalid_time_zone"}, {status: 400});
  }

  if (country && !isValidCountryCode(country)) {
    return NextResponse.json({error: "invalid_country"}, {status: 400});
  }

  if (!channelParam || !isValidContactChannel(channelParam)) {
    return NextResponse.json({error: "invalid_contact_channel"}, {status: 400});
  }

  const availability = await prisma.usherAvailability.findMany({
    where: {
      active: true,
      contact: {
        active: true,
        authorized: true,
        ...(channelParam === "PHONE" ? {phone: {not: null}} : {whatsapp: {not: null}}),
      },
    },
    select: {
      id: true,
      weekday: true,
      startTime: true,
      endTime: true,
      active: true,
      contact: {
        select: {timezone: true, active: true, authorized: true, phone: true, whatsapp: true},
      },
    },
    orderBy: [{weekday: "asc"}, {startTime: "asc"}],
  });

  const slots: PublicAvailabilitySlot[] = [];
  for (const row of availability) {
    if (!row.contact) continue;
    const source = {
      id: row.id,
      weekday: row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
      contactTimezone: row.contact.timezone,
      active: row.active,
      contactActive: row.contact.active,
      contactAuthorized: row.contact.authorized,
      contactPhone: row.contact.phone,
      contactWhatsapp: row.contact.whatsapp,
    };
    if (!isSlotCompatibleWithChannel(source, channelParam)) continue;
    const slot = buildPublicSlot(source, timeZone);
    if (slot) slots.push(slot);
  }

  return NextResponse.json({slots, timeZone});
}
