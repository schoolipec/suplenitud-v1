import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {parsePrayerFilters, prayerQueueWhere, prayerQueueCsv, PRAYER_QUEUE_SELECT} from "@/lib/prayer-queue";

export async function GET(request: Request) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const parsed = parsePrayerFilters(new URL(request.url).searchParams);
  if (!parsed.ok) return NextResponse.json({error: parsed.error}, {status: 400});
  const requests = await prisma.prayerRequest.findMany({
    where: prayerQueueWhere(parsed.filters, true), select: PRAYER_QUEUE_SELECT,
    orderBy: [{createdAt: "desc"}, {id: "desc"}],
  });
  await prisma.auditLog.create({data: {
    actorUserId: actor.id, action: "PRAYER_REQUEST_EXPORTED", resource: "prayer_request",
    metadata: {status: parsed.filters.status, count: requests.length},
  }});
  return new NextResponse(prayerQueueCsv(requests), {headers: {
    "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="prayer-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
  }});
}
