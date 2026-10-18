import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {parsePrayerFilters, prayerQueueWhere, PRAYER_QUEUE_SELECT} from "@/lib/prayer-queue";
import {buildPrayerQueleaPdf} from "@/lib/prayer-quelea-pdf";

export async function POST(request: NextRequest) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }
  let rawFilters: unknown;
  try {
    const body = await request.json();
    rawFilters = (body as {filters?: unknown})?.filters ?? body;
  } catch {
    rawFilters = null;
  }
  const params = new URLSearchParams();
  if (rawFilters && typeof rawFilters === "object") {
    for (const [key, value] of Object.entries(rawFilters as Record<string, unknown>)) {
      if (typeof value === "string" && value) params.set(key, value);
    }
  }
  const parsed = parsePrayerFilters(params);
  if (!parsed.ok) {
    return NextResponse.json({error: parsed.error}, {status: 400});
  }
  const requests = await prisma.prayerRequest.findMany({
    where: prayerQueueWhere(parsed.filters, true),
    select: PRAYER_QUEUE_SELECT,
    orderBy: [{createdAt: "desc"}, {id: "desc"}],
  });
  if (requests.length === 0) {
    return NextResponse.json({error: "no_results"}, {status: 400});
  }
  const pdfBytes = await buildPrayerQueleaPdf(
    requests.map((r) => ({name: r.name, message: r.message, createdAt: r.createdAt.toISOString()})),
  );
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "PRAYER_REQUEST_EXPORTED_PDF",
      resource: "prayer_request",
      metadata: {status: parsed.filters.status, count: requests.length},
    },
  });
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="prayer-requests-quelea-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
