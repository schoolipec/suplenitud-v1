import {NextResponse} from "next/server";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const body = await request.json().catch(() => null) as {key?: string; type?: string} | null;
  if (!body?.key || !/^[a-z0-9.-]+$/.test(body.key) || !body.type) return NextResponse.json({error: "invalid_content_block"}, {status: 400});
  const block = await prisma.contentBlock.create({data: {key: body.key, type: body.type}});
  await prisma.auditLog.create({data: {actorUserId: actor.id, action: "CONTENT_BLOCK_CREATED", resource: "content_block", resourceId: block.id}});
  return NextResponse.json(block, {status: 201});
}
