import {NextResponse} from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const {id} = await params;
  const block = await prisma.contentBlock.findUnique({where: {id}, select: {id: true}});
  if (!block) return NextResponse.json({error: "not_found"}, {status: 404});
  // Retire the live version only: drafts and revisions are left intact.
  await prisma.$transaction([
    prisma.contentTranslation.updateMany({where: {blockId: id}, data: {published: Prisma.DbNull}}),
    prisma.contentBlock.update({where: {id}, data: {status: "DRAFT"}}),
  ]);
  await prisma.auditLog.create({data: {actorUserId: actor.id, action: "CONTENT_BLOCK_UNPUBLISHED", resource: "content_block", resourceId: id}});
  return NextResponse.json({id, status: "DRAFT"});
}
