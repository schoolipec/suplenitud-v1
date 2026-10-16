import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {parsePrayerFilters, prayerQueueWhere, PRAYER_QUEUE_SELECT} from "@/lib/prayer-queue";

export async function GET(request: Request) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const parsed = parsePrayerFilters(new URL(request.url).searchParams);
  if (!parsed.ok) return NextResponse.json({error: parsed.error}, {status: 400});
  const [requests, newCount] = await Promise.all([
    prisma.prayerRequest.findMany({
      where: prayerQueueWhere(parsed.filters), select: PRAYER_QUEUE_SELECT,
      orderBy: [{createdAt: "desc"}, {id: "desc"}],
    }),
    prisma.prayerRequest.count({where: {requestType: "PRAYER_ONLY", status: "NEW"}}),
  ]);
  return NextResponse.json({requests, newCount}, {headers: {"Cache-Control": "private, no-store"}});
}
