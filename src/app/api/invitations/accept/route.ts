import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {hashPassword} from "better-auth/crypto";
import {prisma} from "@/lib/db/client";
import {
  getInvitationStatus,
  hashInvitationToken,
  isAcceptablePassword,
  tokensEqual,
} from "@/lib/invitations";

async function findByToken(token: string) {
  if (typeof token !== "string" || token.length < 16) return null;
  const hash = hashInvitationToken(token);
  const candidates = await prisma.userInvitation.findMany({
    where: {usedAt: null},
    select: {id: true, userId: true, email: true, tokenHash: true, expiresAt: true, revokedAt: true, usedAt: true},
  });
  return candidates.find((row) => tokensEqual(row.tokenHash, hash)) ?? null;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const invitation = await findByToken(token);
  if (!invitation) return NextResponse.json({valid: false, reason: "invalid_token"});
  const status = getInvitationStatus(invitation);
  if (status !== "valid") return NextResponse.json({valid: false, reason: status});
  return NextResponse.json({valid: true, email: invitation.email});
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {token?: unknown; password?: unknown} | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const invitation = await findByToken(token);
  if (!invitation) return NextResponse.json({error: "invalid_token"}, {status: 404});
  const status = getInvitationStatus(invitation);
  if (status !== "valid") {
    return NextResponse.json({error: `invitation_${status}`}, {status: 410});
  }
  if (!isAcceptablePassword(body?.password)) {
    return NextResponse.json({error: "password_too_short"}, {status: 400});
  }

  const existingCredential = await prisma.account.findFirst({
    where: {userId: invitation.userId, providerId: "credential"},
    select: {id: true},
  });

  const passwordHash = await hashPassword(body!.password as string);
  await prisma.$transaction([
    existingCredential
      ? prisma.account.update({where: {id: existingCredential.id}, data: {password: passwordHash}})
      : prisma.account.create({
          data: {
            id: randomUUID(),
            accountId: invitation.userId,
            providerId: "credential",
            userId: invitation.userId,
            password: passwordHash,
          },
        }),
    prisma.user.update({
      where: {id: invitation.userId},
      data: {emailVerified: true, mustChangePassword: false},
    }),
    prisma.userInvitation.update({where: {id: invitation.id}, data: {usedAt: new Date()}}),
  ]);
  await prisma.auditLog.create({
    data: {
      action: "INVITATION_ACCEPTED",
      resource: "user_invitation",
      resourceId: invitation.id,
      metadata: {userId: invitation.userId},
    },
  });

  return NextResponse.json({accepted: true});
}
