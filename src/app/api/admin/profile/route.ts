import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";
import {hasValidPublicOrigin} from "@/lib/request-origin";

export async function PATCH(request: Request) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const session = await auth.api.getSession({headers: request.headers});
  if (!session?.user) return NextResponse.json({error: "unauthenticated"}, {status: 401});
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const payload = body as Record<string, unknown>;
  const data: {name?: string; phone?: string | null; whatsapp?: string | null; telegramChatId?: string | null} = {};
  const name = payload.name;
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) return NextResponse.json({error: "invalid_profile"}, {status: 400});
    data.name = name.trim();
  }
  for (const field of ["phone", "whatsapp", "telegramChatId"] as const) {
    const value = payload[field];
    if (value === undefined) continue;
    if (value === null || value === "") {
      data[field] = null;
    } else if (typeof value === "string") {
      data[field] = value.trim() || null;
    } else {
      return NextResponse.json({error: "invalid_profile"}, {status: 400});
    }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({error: "no_changes"}, {status: 400});
  await prisma.user.update({where: {id: session.user.id}, data});
  await prisma.auditLog.create({data: {actorUserId: session.user.id, action: "PROFILE_UPDATED", resource: "user", resourceId: session.user.id, metadata: {fields: Object.keys(data)}}});
  return NextResponse.json({ok: true});
}
