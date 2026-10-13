import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/lib/invitations";
import {invitationMail} from "@/lib/mail/templates";
import {sendInvitationMail} from "@/lib/mail/send";

function inviteBaseUrl(): string {
  const base = process.env.INVITE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "";
  return base.replace(/\/+$/, "");
}

async function pendingInvitation(userId: string) {
  return prisma.userInvitation.findFirst({
    where: {userId, usedAt: null, revokedAt: null},
    orderBy: {createdAt: "desc"},
  });
}

/**
 * POST {action: "resend" | "revoke"} — resend rotates the token and retries
 * delivery; revoke cancels the pending invitation. Both are audited and
 * require confirmation in the UI.
 */
export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const {id} = await params;
  const body = (await request.json().catch(() => null)) as {action?: string} | null;
  if (body?.action !== "resend" && body?.action !== "revoke") {
    return NextResponse.json({error: "invalid_action"}, {status: 400});
  }

  const user = await prisma.user.findUnique({where: {id}, select: {id: true, name: true, email: true}});
  if (!user) return NextResponse.json({error: "not_found"}, {status: 404});

  const pending = await pendingInvitation(id);

  if (body.action === "revoke") {
    if (!pending) return NextResponse.json({error: "invitation_not_found"}, {status: 404});
    await prisma.userInvitation.update({where: {id: pending.id}, data: {revokedAt: new Date()}});
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "INVITATION_REVOKED",
        resource: "user_invitation",
        resourceId: pending.id,
        metadata: {userId: id},
      },
    });
    return NextResponse.json({revoked: true});
  }

  const credential = await prisma.account.findFirst({where: {userId: id, providerId: "credential"}});
  if (credential && !pending) {
    return NextResponse.json({error: "invitation_already_completed"}, {status: 400});
  }

  const token = generateInvitationToken();
  await prisma.$transaction([
    ...(pending ? [prisma.userInvitation.update({where: {id: pending.id}, data: {revokedAt: new Date()}})] : []),
    prisma.userInvitation.create({
      data: {
        userId: id,
        email: user.email,
        tokenHash: hashInvitationToken(token),
        expiresAt: invitationExpiresAt(),
        createdById: actor.id,
      },
    }),
  ]);
  const created = await prisma.userInvitation.findFirst({
    where: {userId: id, usedAt: null, revokedAt: null},
    orderBy: {createdAt: "desc"},
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "INVITATION_RESENT",
      resource: "user_invitation",
      resourceId: created?.id,
      metadata: {userId: id},
    },
  });

  const mailResult = await sendInvitationMail(
    invitationMail({to: user.email, name: user.name, acceptUrl: `${inviteBaseUrl()}/invite/${token}`}),
  );

  return NextResponse.json({resent: true, emailSent: mailResult.sent, emailReason: mailResult.reason});
}
