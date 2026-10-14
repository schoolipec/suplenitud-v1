import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {RICH_TEXT_FORMAT, findMissingLocales, parseTranslationContent} from "@/lib/content-document";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireMinistryManager(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const {id} = await params;
  const block = await prisma.contentBlock.findUnique({
    where: {id},
    select: {id: true, status: true, translations: {select: {id: true, locale: true, draft: true}}},
  });
  if (!block) return NextResponse.json({error: "not_found"}, {status: 404});
  // Only valid drafts can be promoted; the check runs on drafts, never on live content.
  const missing = findMissingLocales(block.translations.map((translation) => ({locale: translation.locale, content: translation.draft})));
  if (missing.length > 0) {
    return NextResponse.json({error: "incomplete_translations", missing}, {status: 400});
  }
  const promoted = block.translations.map((translation) => {
    const parsed = parseTranslationContent(translation.draft);
    if (!parsed.ok) throw new Error(`invalid_draft:${translation.locale}`);
    return {...translation, source: parsed.source};
  });
  await prisma.$transaction([
    ...promoted.map((entry) =>
      prisma.contentTranslation.update({
        where: {id: entry.id},
        data: {published: {format: RICH_TEXT_FORMAT, source: entry.source}},
      }),
    ),
    prisma.contentBlock.update({where: {id}, data: {status: "PUBLISHED"}}),
    ...promoted.map((entry) =>
      prisma.contentRevision.create({
        data: {
          blockId: id,
          locale: entry.locale,
          action: "published",
          snapshot: {format: RICH_TEXT_FORMAT, source: entry.source, locale: entry.locale, status: "PUBLISHED"},
          createdById: actor.id,
        },
      }),
    ),
  ]);
  await prisma.auditLog.create({data: {actorUserId: actor.id, action: "CONTENT_BLOCK_PUBLISHED", resource: "content_block", resourceId: id}});
  return NextResponse.json({id, status: "PUBLISHED"});
}
