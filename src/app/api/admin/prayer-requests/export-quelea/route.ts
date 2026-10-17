import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {requireMinistryManager} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {prisma} from "@/lib/db/client";
import {parsePrayerFilters, prayerQueueWhere, PRAYER_QUEUE_SELECT, type PrayerQueueItem} from "@/lib/prayer-queue";
import {PDFDocument, rgb, StandardFonts} from "pdf-lib";
import {readFileSync} from "node:fs";
import {join} from "node:path";

const LOGO_PATH = join(process.cwd(), "public", "assets", "logo-transparent.png");
const PAGE_WIDTH = 1920;
const PAGE_HEIGHT = 1080;
const MARGIN = 80;

function toQueueItems(requests: Array<{id: string; name: string; message: string; requestType: string; status: string; createdAt: Date}>): PrayerQueueItem[] {
  return requests.map((r) => ({...r, createdAt: r.createdAt.toISOString()}));
}

function wrapText(text: string, font: any, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, 64);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function GET(request: NextRequest) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireMinistryManager(request);
  if (!actor) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }
  const parsed = parsePrayerFilters(new URL(request.url).searchParams);
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
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: any;
  try {
    const logoBytes = readFileSync(LOGO_PATH);
    logo = await pdf.embedPng(logoBytes);
  } catch {
    logo = null;
  }
  for (const req of requests) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const bg = page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(0.98, 0.99, 1),
    });
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT * 0.28,
      color: rgb(0.031, 0.161, 0.259),
    });
    if (logo) {
      const logoDims = logo.scale(0.22);
      page.drawImage(logo, {
        x: PAGE_WIDTH - MARGIN - logoDims.width,
        y: MARGIN * 0.4,
        width: logoDims.width,
        height: logoDims.height,
        opacity: 1,
      });
    }
    page.drawText(req.name, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN * 1.2,
      size: 72,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    let messageLines = wrapText(req.message, font, maxWidth);
    let fontSize = 64;
    if (messageLines.length > 6) {
      fontSize = 52;
      messageLines = wrapText(req.message, font, maxWidth);
    }
    if (messageLines.length > 10) {
      fontSize = 44;
      const lines2: string[] = [];
      const maxW = PAGE_WIDTH - MARGIN * 2;
      for (const l of messageLines) {
        const words = l.split(/\s+/);
        let cur = "";
        for (const w of words) {
          const t = cur ? `${cur} ${w}` : w;
          if (font.widthOfTextAtSize(t, fontSize) > maxW && cur) {
            lines2.push(cur); cur = w;
          } else cur = t;
        }
        if (cur) lines2.push(cur);
      }
      messageLines = lines2.slice(0, 20);
    }
    let y = PAGE_HEIGHT / 2 + (messageLines.length - 1) * fontSize * 0.6;
    for (const line of messageLines) {
      page.drawText(line, {x: MARGIN, y, size: fontSize, font, color: rgb(0.031, 0.161, 0.259)});
      y -= fontSize * 1.2;
    }
    page.drawText(new Date(req.createdAt).toISOString().slice(0, 10), {
      x: MARGIN,
      y: MARGIN * 0.8,
      size: 28,
      font,
      color: rgb(0.031, 0.161, 0.259),
    });
  }
  const pdfBytes = await pdf.save();
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
