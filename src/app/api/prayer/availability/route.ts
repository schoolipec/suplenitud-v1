import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {isValidTimeZone} from "@/lib/prayer-validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const timeZone = url.searchParams.get("timeZone");
  const country = url.searchParams.get("country");

  if (!timeZone || !isValidTimeZone(timeZone)) {
    return NextResponse.json({error: "invalid_time_zone"}, {status: 400});
  }

  if (!country || !/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({error: "invalid_country"}, {status: 400});
  }

  const availability = await prisma.usherAvailability.findMany({
    where: {active: true},
    include: {
      contact: {
        where: {active: true, authorized: true},
        select: {id: true, name: true, ministry: true, locale: true, timezone: true, phone: true, whatsapp: true},
      },
    },
    orderBy: [{contact: {name: "asc"}}, {weekday: "asc"}, {startTime: "asc"}],
  });

  const slots = availability
    .filter((a) => a.contact !== null)
    .map((a) => {
      const contact = a.contact!;
      const now = new Date();
      const visitorDay = new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "short",
      }).format(now);
      const dayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };

      const visitorWeekday = dayMap[visitorDay] ?? 0;
      const contactWeekday = a.weekday;

      const diff = (visitorWeekday - contactWeekday + 7) % 7;
      const slotDate = new Date(now);
      slotDate.setDate(slotDate.getDate() + diff);

      const dateStr = slotDate.toISOString().split("T")[0];

      return {
        id: `${a.id}-${dateStr}`,
        availabilityId: a.id,
        contactId: contact.id,
        contactName: contact.name,
        date: dateStr,
        startTime: a.startTime,
        endTime: a.endTime,
        timezone: contact.timezone,
      };
    });

  return NextResponse.json({slots});
}
