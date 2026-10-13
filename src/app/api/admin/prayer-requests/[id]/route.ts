import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {isValidPrayerRequestStatus, canTransitionTo} from "@/lib/prayer-validation";
import {notifyAdmins} from "@/lib/prayer-notifications";

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const {id} = await params;
  const prayerRequest = await prisma.prayerRequest.findUnique({
    where: {id},
    include: {
      assignments: {
        include: {
          contact: {
            select: {id: true, name: true, ministry: true, locale: true, phone: true, whatsapp: true},
          },
        },
      },
    },
  });

  if (!prayerRequest) {
    return NextResponse.json({error: "not_found"}, {status: 404});
  }

  return NextResponse.json({request: prayerRequest});
}

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const {id} = await params;
  const body = await request.json().catch(() => null) as {
    status?: string;
    contactId?: string;
  } | null;

  if (!body) {
    return NextResponse.json({error: "invalid_request"}, {status: 400});
  }

  const existing = await prisma.prayerRequest.findUnique({
    where: {id},
    include: {assignments: true},
  });

  if (!existing) {
    return NextResponse.json({error: "not_found"}, {status: 404});
  }

  const updates: Record<string, unknown> = {};

  if (body.status) {
    if (!isValidPrayerRequestStatus(body.status)) {
      return NextResponse.json({error: "invalid_status"}, {status: 400});
    }
    if (!canTransitionTo(existing.status as "NEW" | "PENDING_ASSIGNMENT" | "ASSIGNED" | "CONTACTED" | "CLOSED", body.status)) {
      return NextResponse.json({error: "invalid_transition"}, {status: 400});
    }
    updates.status = body.status;
  }

  if (body.contactId) {
    const contact = await prisma.ministryContact.findUnique({
      where: {id: body.contactId},
      select: {id: true, active: true, authorized: true, name: true},
    });

    if (!contact || !contact.active || !contact.authorized) {
      return NextResponse.json({error: "invalid_contact"}, {status: 400});
    }

    const existingAssignment = existing.assignments[0];
    if (existingAssignment) {
      await prisma.prayerAssignment.update({
        where: {id: existingAssignment.id},
        data: {contactId: body.contactId, assignedById: actor.id, assignedAt: new Date()},
      });
    } else {
      await prisma.prayerAssignment.create({
        data: {
          requestId: id,
          contactId: body.contactId,
          usherName: contact.name,
          assignedById: actor.id,
        },
      });
    }

    if (existing.status === "NEW" || existing.status === "PENDING_ASSIGNMENT") {
      updates.status = "ASSIGNED";
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "PRAYER_REQUEST_ASSIGNED",
        resource: "prayer_request",
        resourceId: id,
        metadata: {contactId: body.contactId},
      },
    });

    try {
      await notifyAdmins({
        type: "ASSIGNMENT_MADE",
        requestId: id,
        title: `Contact assigned for request from ${existing.name.slice(0, 80)}`,
        excludeUserId: actor.id,
      });
    } catch {
      // Internal alerts must never break the assignment flow.
    }
  }

  if (Object.keys(updates).length > 0) {
    const updated = await prisma.prayerRequest.update({
      where: {id},
      data: updates,
    });

    if (body.status) {
      await prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "PRAYER_REQUEST_STATUS_CHANGED",
          resource: "prayer_request",
          resourceId: id,
          metadata: {from: existing.status, to: body.status},
        },
      });
    }

    return NextResponse.json({request: updated});
  }

  return NextResponse.json({request: existing});
}
