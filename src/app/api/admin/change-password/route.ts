import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const session = await auth.api.getSession({headers: request.headers});
  if (!session?.user) return NextResponse.json({error: "unauthenticated"}, {status: 401});
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {currentPassword, newPassword} = body as Record<string, unknown>;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 16) return NextResponse.json({error: "invalid_password"}, {status: 400});
  await auth.api.changePassword({headers: request.headers, body: {currentPassword, newPassword, revokeOtherSessions: true}});
  await prisma.user.update({where: {id: session.user.id}, data: {mustChangePassword: false}});
  await prisma.auditLog.create({data: {actorUserId: session.user.id, action: "PASSWORD_CHANGED", resource: "user", resourceId: session.user.id}});
  return NextResponse.json({ok: true});
}
