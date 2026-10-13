import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";

export async function GET(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const take = Math.min(Math.max(Number(url.searchParams.get("take")) || 50, 1), 200);

  const [notifications, unreadCount] = await Promise.all([
    prisma.prayerNotification.findMany({
      where: {userId: actor.id, ...(unreadOnly ? {read: false} : {})},
      orderBy: {createdAt: "desc"},
      take,
      include: {request: {select: {id: true, name: true, status: true, requestType: true}}},
    }),
    prisma.prayerNotification.count({where: {userId: actor.id, read: false}}),
  ]);

  return NextResponse.json({notifications, unreadCount});
}

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const body = await request.json().catch(() => null) as {action?: string} | null;
  if (body?.action !== "read-all") {
    return NextResponse.json({error: "invalid_action"}, {status: 400});
  }

  const result = await prisma.prayerNotification.updateMany({
    where: {userId: actor.id, read: false},
    data: {read: true, readAt: new Date()},
  });

  return NextResponse.json({markedRead: result.count});
}
