import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {isRequiredLocale} from "@/lib/content-catalog";
import {RICH_TEXT_FORMAT, parseTranslationContent} from "@/lib/content-document";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const body = await request.json().catch(() => null) as {revisionId?: unknown; confirm?: unknown} | null;
  const {id} = await params;
  if (!body || body.confirm !== true || typeof body.revisionId !== "string") {
    return NextResponse.json({error: "confirmation_required"}, {status: 400});
  }
  const revision = await prisma.contentRevision.findUnique({where: {id: body.revisionId}});
  if (!revision || revision.blockId !== id) return NextResponse.json({error: "not_found"}, {status: 404});
  const snapshot = revision.snapshot as Record<string, unknown>;
  const locale = revision.locale ?? snapshot.locale;
  if (!isRequiredLocale(locale)) return NextResponse.json({error: "unrestorable_revision"}, {status: 400});
  const parsed = parseTranslationContent({format: RICH_TEXT_FORMAT, source: snapshot.source});
  if (!parsed.ok) return NextResponse.json({error: "unrestorable_revision", details: parsed.errors}, {status: 400});
  const block = await prisma.contentBlock.findUnique({where: {id}, select: {id: true, status: true}});
  if (!block) return NextResponse.json({error: "not_found"}, {status: 404});
  const content = {format: RICH_TEXT_FORMAT, source: parsed.source};
  const translation = await prisma.contentTranslation.upsert({
    where: {blockId_locale: {blockId: id, locale}},
    update: {content},
    create: {blockId: id, locale, content},
  });
  await prisma.contentRevision.create({
    data: {blockId: id, locale, action: "restored", snapshot: {...content, locale, status: block.status, restoredFrom: revision.id}, createdById: actor.id},
  });
  await prisma.auditLog.create({data: {actorUserId: actor.id, action: "CONTENT_REVISION_RESTORED", resource: "content_revision", resourceId: revision.id, metadata: {blockId: id, locale}}});
  return NextResponse.json(translation);
}
