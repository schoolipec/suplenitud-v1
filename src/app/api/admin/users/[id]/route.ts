import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {ApplicationRole} from "@/generated/prisma/client";

const assignableRoles = [ApplicationRole.ADMIN, ApplicationRole.TREASURER, ApplicationRole.USHER] as const;

type Params = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Params) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const {id} = await params;
  const target = await prisma.user.findUnique({where: {id}, select: {id: true, active: true}});
  if (!target) return NextResponse.json({error: "user_not_found"}, {status: 404});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, role, active, forcePasswordChange} = body as Record<string, unknown>;

  const data: {name?: string; active?: boolean; mustChangePassword?: boolean} = {};
  const auditMetadata: Record<string, unknown> = {};
  let roleChange: ApplicationRole | null = null;

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({error: "invalid_name"}, {status: 400});
    }
    data.name = name.trim();
    auditMetadata.name = data.name;
  }

  if (role !== undefined) {
    if (typeof role !== "string" || !assignableRoles.includes(role as (typeof assignableRoles)[number])) {
      return NextResponse.json({error: "invalid_role"}, {status: 400});
    }
    roleChange = role as ApplicationRole;
    auditMetadata.role = role;
  }

  if (active !== undefined) {
    if (typeof active !== "boolean") return NextResponse.json({error: "invalid_active"}, {status: 400});
    if (active === false && target.id === actor.id) {
      return NextResponse.json({error: "cannot_deactivate_self"}, {status: 400});
    }
    data.active = active;
    auditMetadata.active = active;
  }

  if (forcePasswordChange !== undefined) {
    if (typeof forcePasswordChange !== "boolean") {
      return NextResponse.json({error: "invalid_force_password_change"}, {status: 400});
    }
    data.mustChangePassword = forcePasswordChange;
    auditMetadata.forcePasswordChange = forcePasswordChange;
  }

  const revokeSessions = data.active === false || data.mustChangePassword === true;

  await prisma.$transaction(async (tx) => {
    if (roleChange) {
      await tx.userRole.deleteMany({where: {userId: target.id}});
      await tx.userRole.create({data: {userId: target.id, role: roleChange}});
    }
    if (Object.keys(data).length > 0) {
      await tx.user.update({where: {id: target.id}, data});
    }
    if (revokeSessions) {
      await tx.session.deleteMany({where: {userId: target.id}});
    }
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "USER_UPDATED",
        resource: "user",
        resourceId: target.id,
        metadata: {...auditMetadata, sessionsRevoked: revokeSessions || undefined},
      },
    });
  });

  return NextResponse.json({ok: true});
}
