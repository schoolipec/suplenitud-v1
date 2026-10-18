import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {ApplicationRole} from "@/generated/prisma/client";
import {ASSIGNABLE_USER_ROLES} from "@/lib/admin-user-actions";
import {parseAdminUsersQuery, queryAdminUsers} from "@/lib/admin-users-query";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/lib/invitations";
import {invitationMail} from "@/lib/mail/templates";
import {sendInvitationMail} from "@/lib/mail/send";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const assignableRoles = [ApplicationRole.ADMIN, ApplicationRole.TREASURER, ApplicationRole.USHER] as const;

function inviteBaseUrl(): string {
  const base = process.env.INVITE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "";
  return base.replace(/\/+$/, "");
}

export async function GET(request: Request) {
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const url = new URL(request.url);
  const result = await queryAdminUsers(parseAdminUsersQuery(url.searchParams));
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, email, role} = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    typeof email !== "string" ||
    !emailPattern.test(email) ||
    typeof role !== "string" ||
    !assignableRoles.includes(role as (typeof assignableRoles)[number])
  ) {
    return NextResponse.json({error: "invalid_user_data"}, {status: 400});
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await prisma.user.findUnique({where: {email: normalizedEmail}})) {
    return NextResponse.json({error: "email_already_exists"}, {status: 409});
  }

  // No password is ever set here: the account is created without credentials
  // and stays unable to sign in until the invitation is accepted.
  const userId = randomUUID();
  const token = generateInvitationToken();
  const created = await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        emailVerified: false,
        active: true,
        mustChangePassword: true,
      },
    }),
    prisma.userRole.create({data: {userId, role: role as ApplicationRole}}),
    prisma.userInvitation.create({
      data: {
        userId,
        email: normalizedEmail,
        tokenHash: hashInvitationToken(token),
        expiresAt: invitationExpiresAt(),
        createdById: actor.id,
      },
    }),
  ]);
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "USER_CREATED",
      resource: "user",
      resourceId: userId,
      metadata: {role, active: true, assignableRoles: [...ASSIGNABLE_USER_ROLES]},
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "INVITATION_CREATED",
      resource: "user_invitation",
      resourceId: created[2].id,
      metadata: {userId, email: normalizedEmail},
    },
  });

  const acceptUrl = `${inviteBaseUrl()}/invite/${token}`;
  const mailResult = await sendInvitationMail(
    invitationMail({to: normalizedEmail, name: name.trim(), acceptUrl}),
  );

  return NextResponse.json(
    {id: userId, email: normalizedEmail, emailSent: mailResult.sent, emailReason: mailResult.reason},
    {status: 201},
  );
}
