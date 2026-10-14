import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {findMissingLocales} from "@/lib/content-document";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const {id} = await params;
  const block = await prisma.contentBlock.findUnique({
    where: {id},
    select: {id: true, status: true, translations: {select: {locale: true, content: true}}},
  });
  if (!block) return NextResponse.json({error: "not_found"}, {status: 404});
  const missing = findMissingLocales(block.translations);
  if (missing.length > 0) {
    return NextResponse.json({error: "incomplete_translations", missing}, {status: 400});
  }
  const updated = await prisma.contentBlock.update({where: {id}, data: {status: "PUBLISHED"}});
  await prisma.contentRevision.createMany({
    data: block.translations.map((translation) => ({
      blockId: id,
      locale: translation.locale,
      action: "published",
      snapshot: {...(translation.content as Record<string, unknown>), locale: translation.locale, status: "PUBLISHED"},
      createdById: actor.id,
    })),
  });
  await prisma.auditLog.create({data: {actorUserId: actor.id, action: "CONTENT_BLOCK_PUBLISHED", resource: "content_block", resourceId: id}});
  return NextResponse.json(updated);
}
