import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {isRequiredLocale} from "@/lib/content-catalog";
import {RICH_TEXT_FORMAT, parseTranslationContent} from "@/lib/content-document";

export async function PUT(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const body = await request.json().catch(() => null) as {locale?: unknown; source?: unknown} | null;
  const {id} = await params;
  if (!body || !isRequiredLocale(body.locale)) return NextResponse.json({error: "invalid_translation"}, {status: 400});
  const parsed = parseTranslationContent({format: RICH_TEXT_FORMAT, source: body.source});
  if (!parsed.ok) return NextResponse.json({error: "invalid_document", details: parsed.errors}, {status: 400});
  const block = await prisma.contentBlock.findUnique({where: {id}, select: {id: true, status: true}});
  if (!block) return NextResponse.json({error: "not_found"}, {status: 404});
  const content = {format: RICH_TEXT_FORMAT, source: parsed.source};
  const translation = await prisma.contentTranslation.upsert({
    where: {blockId_locale: {blockId: id, locale: body.locale}},
    update: {content},
    create: {blockId: id, locale: body.locale, content},
  });
  await prisma.contentRevision.create({
    data: {blockId: id, locale: body.locale, action: "saved", snapshot: {...content, locale: body.locale, status: block.status}, createdById: actor.id},
  });
  await prisma.auditLog.create({data: {actorUserId: actor.id, action: "CONTENT_TRANSLATION_SAVED", resource: "content_translation", resourceId: translation.id, metadata: {blockId: id, locale: body.locale}}});
  return NextResponse.json(translation);
}
