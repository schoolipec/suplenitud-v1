import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, email, temporaryPassword} = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length < 2 || typeof email !== "string" || !emailPattern.test(email) || typeof temporaryPassword !== "string" || temporaryPassword.length < 16) {
    return NextResponse.json({error: "invalid_user_data"}, {status: 400});
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await prisma.user.findUnique({where: {email: normalizedEmail}})) return NextResponse.json({error: "email_already_exists"}, {status: 409});

  const created = await auth.api.signUpEmail({body: {name: name.trim(), email: normalizedEmail, password: temporaryPassword}});
  await prisma.$transaction([
    prisma.userRole.create({data: {userId: created.user.id, role: "ADMIN"}}),
    prisma.auditLog.create({
      data: {actorUserId: actor.id, action: "ADMIN_CREATED", resource: "user", resourceId: created.user.id},
    }),
  ]);

  return NextResponse.json({id: created.user.id, email: normalizedEmail}, {status: 201});
}
