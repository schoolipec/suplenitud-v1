import {NextResponse} from "next/server";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireSuperAdmin(request); if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const {id} = await params;
  const block = await prisma.contentBlock.update({where: {id}, data: {status: "DRAFT"}});
  await prisma.auditLog.create({data: {actorUserId: actor.id, action: "CONTENT_BLOCK_UNPUBLISHED", resource: "content_block", resourceId: id}});
  return NextResponse.json(block);
}
