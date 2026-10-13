import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {isValidPrayerRequestStatus, isValidPrayerRequestType} from "@/lib/prayer-validation";

export async function GET(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const requestType = url.searchParams.get("requestType");
  const country = url.searchParams.get("country");
  const contactChannel = url.searchParams.get("contactChannel");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const hasAvailability = url.searchParams.get("hasAvailability");
  const search = url.searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status && isValidPrayerRequestStatus(status)) {
    where.status = status;
  }
  if (requestType && isValidPrayerRequestType(requestType)) {
    where.requestType = requestType;
  }
  if (country && /^[A-Z]{2}$/.test(country)) {
    where.country = country;
  }
  if (contactChannel && ["PHONE", "WHATSAPP"].includes(contactChannel)) {
    where.contactChannel = contactChannel;
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    }
    if (dateTo) {
      (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
    }
  }
  if (hasAvailability === "true") {
    where.availabilitySlotId = {not: null};
  } else if (hasAvailability === "false") {
    where.availabilitySlotId = null;
  }
  if (search) {
    where.OR = [
      {name: {contains: search, mode: "insensitive"}},
      {message: {contains: search, mode: "insensitive"}},
      {email: {contains: search, mode: "insensitive"}},
    ];
  }

  const requests = await prisma.prayerRequest.findMany({
    where,
    orderBy: {createdAt: "desc"},
    take: 200,
    include: {
      assignments: {
        include: {
          contact: {
            select: {id: true, name: true, ministry: true, locale: true},
          },
        },
      },
    },
  });

  return NextResponse.json({requests});
}
