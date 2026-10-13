import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const {id} = await params;
  const body = await request.json().catch(() => null) as {read?: boolean} | null;
  if (typeof body?.read !== "boolean") {
    return NextResponse.json({error: "invalid_request"}, {status: 400});
  }

  const existing = await prisma.prayerNotification.findUnique({where: {id}});
  if (!existing || existing.userId !== actor.id) {
    return NextResponse.json({error: "not_found"}, {status: 404});
  }

  const updated = await prisma.prayerNotification.update({
    where: {id},
    data: {read: body.read, readAt: body.read ? new Date() : null},
  });

  return NextResponse.json({notification: updated});
}
