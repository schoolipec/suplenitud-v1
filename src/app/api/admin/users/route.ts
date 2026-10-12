import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";
import {ApplicationRole} from "@/generated/prisma/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const assignableRoles = [ApplicationRole.ADMIN, ApplicationRole.TREASURER, ApplicationRole.USHER] as const;

function hasValidPublicOrigin(request: Request) {
  const publicOrigin = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  return Boolean(publicOrigin && request.headers.get("origin") === new URL(publicOrigin).origin);
}

export async function GET(request: Request) {
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const users = await prisma.user.findMany({
    orderBy: {createdAt: "asc"},
    select: {id: true, name: true, email: true, createdAt: true, twoFactorEnabled: true, roles: {select: {role: true}}},
  });
  return NextResponse.json({users: users.map((user) => ({...user, roles: user.roles.map(({role}) => role)}))});
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
  if (typeof name !== "string" || name.trim().length < 2 || typeof email !== "string" || !emailPattern.test(email) || typeof temporaryPassword !== "string" || temporaryPassword.length < 16 || typeof role !== "string" || !assignableRoles.includes(role as (typeof assignableRoles)[number])) {
    return NextResponse.json({error: "invalid_user_data"}, {status: 400});
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await prisma.user.findUnique({where: {email: normalizedEmail}})) return NextResponse.json({error: "email_already_exists"}, {status: 409});

  const created = await auth.api.signUpEmail({body: {name: name.trim(), email: normalizedEmail, password: temporaryPassword}});
  await prisma.$transaction([
    prisma.userRole.create({data: {userId: created.user.id, role: role as ApplicationRole}}),
    prisma.auditLog.create({
      data: {actorUserId: actor.id, action: "USER_CREATED", resource: "user", resourceId: created.user.id, metadata: {role}},
    }),
  ]);

  return NextResponse.json({id: created.user.id, email: normalizedEmail}, {status: 201});
}
