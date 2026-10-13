import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";

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
