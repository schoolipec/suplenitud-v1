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

  let preferences = await prisma.notificationPreference.findUnique({
    where: {userId: actor.id},
  });

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: {id: actor.id, userId: actor.id},
    });
  }

  return NextResponse.json({preferences});
}

export async function PATCH(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const body = await request.json().catch(() => null) as {
    newPrayerRequest?: boolean;
    newContactRequest?: boolean;
    pendingAssignment?: boolean;
    assignmentMade?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({error: "invalid_request"}, {status: 400});
  }

  const updates: Record<string, boolean> = {};
  if (typeof body.newPrayerRequest === "boolean") updates.newPrayerRequest = body.newPrayerRequest;
  if (typeof body.newContactRequest === "boolean") updates.newContactRequest = body.newContactRequest;
  if (typeof body.pendingAssignment === "boolean") updates.pendingAssignment = body.pendingAssignment;
  if (typeof body.assignmentMade === "boolean") updates.assignmentMade = body.assignmentMade;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({error: "no_updates"}, {status: 400});
  }

  let preferences = await prisma.notificationPreference.findUnique({
    where: {userId: actor.id},
  });

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: {id: actor.id, userId: actor.id, ...updates},
    });
  } else {
    preferences = await prisma.notificationPreference.update({
      where: {userId: actor.id},
      data: updates,
    });
  }

  return NextResponse.json({preferences});
}
