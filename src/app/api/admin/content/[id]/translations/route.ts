import {NextResponse} from "next/server";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
const locales = new Set(["en", "es", "pt", "ko", "de"]);
export async function PUT(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!hasValidPublicOrigin(request)) return NextResponse.json({error: "invalid_origin"}, {status: 403});
  const actor = await requireSuperAdmin(request); if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});
  const body = await request.json().catch(() => null) as {locale?: string; content?: unknown} | null;
  const {id} = await params;
  if (!body?.locale || !locales.has(body.locale) || !body.content || typeof body.content !== "object") return NextResponse.json({error: "invalid_translation"}, {status: 400});
  const translation = await prisma.contentTranslation.upsert({where: {blockId_locale: {blockId: id, locale: body.locale}}, update: {content: body.content}, create: {blockId: id, locale: body.locale, content: body.content}});
  await prisma.contentRevision.create({data: {blockId: id, snapshot: body.content, createdById: actor.id}});
  return NextResponse.json(translation);
}
