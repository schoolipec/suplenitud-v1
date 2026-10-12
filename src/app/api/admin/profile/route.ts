import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";

function hasValidPublicOrigin(request: Request) {
  const publicOrigin = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  return Boolean(publicOrigin && request.headers.get("origin") === new URL(publicOrigin).origin);
}

export async function PATCH(request: Request) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const session = await auth.api.getSession({headers: request.headers});
  if (!session?.user) return NextResponse.json({error: "unauthenticated"}, {status: 401});
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, phone, whatsapp, telegramChatId} = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length < 2 || [phone, whatsapp, telegramChatId].some((value) => value !== null && value !== undefined && typeof value !== "string")) return NextResponse.json({error: "invalid_profile"}, {status: 400});
  await prisma.user.update({where: {id: session.user.id}, data: {name: name.trim(), phone: typeof phone === "string" ? phone.trim() || null : null, whatsapp: typeof whatsapp === "string" ? whatsapp.trim() || null : null, telegramChatId: typeof telegramChatId === "string" ? telegramChatId.trim() || null : null}});
  await prisma.auditLog.create({data: {actorUserId: session.user.id, action: "PROFILE_UPDATED", resource: "user", resourceId: session.user.id}});
  return NextResponse.json({ok: true});
}
