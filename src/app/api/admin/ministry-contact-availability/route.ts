import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {isValidAvailabilityWeekday, isValidTimeFormat, isValidAvailabilityRange} from "@/lib/prayer-validation";

export async function GET(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const availability = await prisma.usherAvailability.findMany({
    where: {active: true},
    include: {
      contact: {
        select: {id: true, name: true, ministry: true, locale: true, timezone: true, phone: true, whatsapp: true},
      },
    },
    orderBy: [{contact: {name: "asc"}}, {weekday: "asc"}, {startTime: "asc"}],
  });

  return NextResponse.json({availability});
}

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const body = await request.json().catch(() => null) as {
    contactId?: string;
    weekday?: number;
    startTime?: string;
    endTime?: string;
  } | null;

  if (!body?.contactId || !isValidAvailabilityWeekday(body.weekday) || !isValidTimeFormat(body.startTime) || !isValidTimeFormat(body.endTime)) {
    return NextResponse.json({error: "invalid_availability"}, {status: 400});
  }

  const {contactId, weekday, startTime, endTime} = body;

  if (!startTime || !endTime || !isValidAvailabilityRange(startTime, endTime)) {
    return NextResponse.json({error: "invalid_range"}, {status: 400});
  }

  const contact = await prisma.ministryContact.findUnique({
    where: {id: contactId},
    select: {id: true, active: true, name: true, timezone: true},
  });

  if (!contact || !contact.active) {
    return NextResponse.json({error: "invalid_contact"}, {status: 400});
  }

  const created = await prisma.usherAvailability.create({
    data: {
      contactId,
      usherName: contact.name,
      timezone: contact.timezone,
      weekday: weekday!,
      startTime: startTime!,
      endTime: endTime!,
    },
  });

  return NextResponse.json({availability: created}, {status: 201});
}
