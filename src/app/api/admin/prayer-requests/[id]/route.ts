import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {canUpdatePrayer, parsePrayerStatusUpdate, PRAYER_QUEUE_SELECT} from "@/lib/prayer-queue";

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  if (!await requireMinistryManager(request)) return NextResponse.json({error: "forbidden"}, {status: 403});
  if (new URL(request.url).search) return NextResponse.json({error: "invalid_filters"}, {status: 400});
  const {id} = await params;
  const prayerRequest = await prisma.prayerRequest.findUnique({where: {id}, select: PRAYER_QUEUE_SELECT});
  if (!prayerRequest) return NextResponse.json({error: "not_found"}, {status: 404});
  return NextResponse.json({request: prayerRequest}, {headers: {"Cache-Control": "private, no-store"}});
}

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const status = parsePrayerStatusUpdate(await request.json().catch(() => null));
  if (!status) return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {id} = await params;
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.prayerRequest.findUnique({where: {id}, select: {status: true, requestType: true}});
    if (!existing) return {error: "not_found", statusCode: 404} as const;
    if (!canUpdatePrayer(existing, status)) return {error: "invalid_transition", statusCode: 409} as const;
    // Compare-and-set prevents concurrent requests from auditing a transition twice.
    const changed = await tx.prayerRequest.updateMany({
      where: {id, requestType: "PRAYER_ONLY", status: existing.status}, data: {status},
    });
    if (changed.count !== 1) return {error: "conflict", statusCode: 409} as const;
    await tx.auditLog.create({data: {
      actorUserId: actor.id, action: "PRAYER_REQUEST_STATUS_CHANGED", resource: "prayer_request", resourceId: id,
      metadata: {from: existing.status, to: status},
    }});
    return {request: await tx.prayerRequest.findUnique({where: {id}, select: PRAYER_QUEUE_SELECT})};
  });
  if ("error" in result) return NextResponse.json({error: result.error}, {status: result.statusCode});
  return NextResponse.json(result, {headers: {"Cache-Control": "private, no-store"}});
}
