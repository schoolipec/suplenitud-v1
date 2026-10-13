import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {ApplicationRole} from "@/generated/prisma/client";
import {ASSIGNABLE_USER_ROLES} from "@/lib/admin-user-actions";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const assignableRoles = [ApplicationRole.ADMIN, ApplicationRole.TREASURER, ApplicationRole.USHER] as const;

export async function GET(request: Request) {
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const users = await prisma.user.findMany({
    orderBy: {createdAt: "asc"},
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      active: true,
      twoFactorEnabled: true,
      roles: {select: {role: true}},
      sessions: {select: {updatedAt: true}, orderBy: {updatedAt: "desc"}, take: 1},
    },
  });
  return NextResponse.json({
    users: users.map(({sessions, ...user}) => ({
      ...user,
      roles: user.roles.map(({role}) => role),
      lastActivityAt: sessions[0]?.updatedAt ?? null,
    })),
  });
}

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, email, temporaryPassword, role} = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    typeof email !== "string" ||
    !emailPattern.test(email) ||
    typeof temporaryPassword !== "string" ||
    temporaryPassword.length < 16 ||
    typeof role !== "string" ||
    !assignableRoles.includes(role as (typeof assignableRoles)[number])
  ) {
    return NextResponse.json({error: "invalid_user_data"}, {status: 400});
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await prisma.user.findUnique({where: {email: normalizedEmail}})) {
    return NextResponse.json({error: "email_already_exists"}, {status: 409});
  }

  const created = await auth.api.signUpEmail({
    body: {name: name.trim(), email: normalizedEmail, password: temporaryPassword},
  });
  await prisma.$transaction([
    prisma.user.update({where: {id: created.user.id}, data: {active: true, mustChangePassword: true}}),
    prisma.userRole.create({data: {userId: created.user.id, role: role as ApplicationRole}}),
    prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "USER_CREATED",
        resource: "user",
        resourceId: created.user.id,
        metadata: {role, active: true, assignableRoles: [...ASSIGNABLE_USER_ROLES]},
      },
    }),
  ]);

  return NextResponse.json({id: created.user.id, email: normalizedEmail}, {status: 201});
}
