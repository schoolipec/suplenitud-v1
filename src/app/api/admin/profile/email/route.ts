import {verifyPassword} from "@better-auth/utils/password";
import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";
import {hasValidPublicOrigin} from "@/lib/request-origin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const session = await auth.api.getSession({headers: request.headers});
  if (!session?.user) return NextResponse.json({error: "unauthenticated"}, {status: 401});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {email, currentPassword} = body as Record<string, unknown>;
  const nextEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!emailPattern.test(nextEmail) || typeof currentPassword !== "string" || currentPassword.length === 0) {
    return NextResponse.json({error: "invalid_request"}, {status: 400});
  }
  if (nextEmail === session.user.email.toLowerCase()) return NextResponse.json({error: "same_email"}, {status: 400});

  const credential = await prisma.account.findFirst({
    where: {userId: session.user.id, providerId: "credential"},
    select: {password: true},
  });
  if (!credential?.password || !(await verifyPassword(credential.password, currentPassword))) {
    return NextResponse.json({error: "invalid_credentials"}, {status: 403});
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({where: {email: nextEmail}, select: {id: true}});
      if (existing) throw new Error("email_in_use");
      await tx.user.update({where: {id: session.user.id}, data: {email: nextEmail}});
      await tx.session.deleteMany({where: {userId: session.user.id}});
      await tx.auditLog.create({
        data: {actorUserId: session.user.id, action: "PROFILE_EMAIL_CHANGED", resource: "user", resourceId: session.user.id, metadata: {sessionsRevoked: true}},
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "email_in_use") return NextResponse.json({error: "email_in_use"}, {status: 409});
    throw error;
  }
  return NextResponse.json({ok: true, email: nextEmail});
}
