import {PDFDocument, rgb, StandardFonts} from "pdf-lib";
import type {PDFImage, PDFFont} from "pdf-lib";
import {readFileSync} from "node:fs";
import {join} from "node:path";

export const LOGO_PATH = join(process.cwd(), "public", "assets", "logo-dark.png");
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
export const MARGIN = 80;
export const HEADER_HEIGHT = 300;
export const HEADER_BOTTOM = PAGE_HEIGHT - HEADER_HEIGHT;
export const CONTENT_TOP = HEADER_BOTTOM - 80;
export const CONTENT_BOTTOM = MARGIN * 2;
export const AVAILABLE_HEIGHT = CONTENT_TOP - CONTENT_BOTTOM;
export const MAX_MESSAGE_CHARS = 500;
export const NAME_MAX_START = 72;
export const NAME_MIN = 24;
export const MSG_MAX_START = 64;
export const MSG_MIN = 20;
export const DATE_SIZE = 28;
const NAVY = rgb(0.031, 0.161, 0.259);
const LIGHT = rgb(0.98, 0.99, 1);
const WHITE = rgb(1, 1, 1);

export type QueleaPdfItem = {
  name: string;
  message: string;
  createdAt: string;
};

export function wrapByWords(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
    if (font.widthOfTextAtSize(current, fontSize) > maxWidth) {
      let partial = "";
      for (let i = 0; i < current.length; i++) {
        const t = partial + current[i];
        if (font.widthOfTextAtSize(t, fontSize) > maxWidth && partial) {
          lines.push(partial);
          partial = current[i];
        } else {
          partial = t;
        }
      }
      current = partial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function wrapByChars(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const t = current + c;
    if (font.widthOfTextAtSize(t, fontSize) > maxWidth && current) {
      lines.push(current);
      current = c === " " ? "" : c;
    } else {
      current = t;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const hasLongWord = words.some((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth);
  return hasLongWord ? wrapByChars(text, font, fontSize, maxWidth) : wrapByWords(text, font, fontSize, maxWidth);
}

export function fitText(text: string, font: PDFFont, maxWidth: number, maxHeight: number, startSize: number): {lines: string[]; fontSize: number} {
  let size = startSize;
  for (let step = 0; step < 30; step++) {
    const lines = wrapText(text, font, size, maxWidth);
    const height = lines.length * size * 1.2;
    if (height <= maxHeight) return {lines, fontSize: size};
    size -= 2;
    if (size < MSG_MIN) break;
  }
  const finalSize = size < MSG_MIN ? MSG_MIN : size;
  const lines = wrapText(text, font, finalSize, maxWidth);
  return {lines, fontSize: finalSize};
}

export function fitName(text: string, font: PDFFont, maxWidth: number): {text: string; fontSize: number} {
  let size = NAME_MAX_START;
  for (let step = 0; step < 20; step++) {
    const width = font.widthOfTextAtSize(text, size);
    if (width <= maxWidth) return {text, fontSize: size};
    size -= 2;
    if (size < NAME_MIN) break;
  }
  const finalSize = size < NAME_MIN ? NAME_MIN : size;
  const words = text.split(/\s+/);
  const lines = wrapText(text, font, finalSize, maxWidth);
  if (lines.length <= 1 && font.widthOfTextAtSize(text, finalSize) <= maxWidth) {
    return {text, fontSize: finalSize};
  }
  let truncated = words.join(" ");
  while (truncated.length > 4) {
    const candidate = `${truncated}…`;
    if (font.widthOfTextAtSize(candidate, finalSize) <= maxWidth) return {text: candidate, fontSize: finalSize};
    truncated = truncated.slice(0, -1).replace(/\s+\S*$/, "");
    if (!truncated) break;
  }
  return {text: `${text.slice(0, 8)}…`, fontSize: finalSize};
}

export function loadLogoBytes(): Buffer | null {
  try {
    return readFileSync(LOGO_PATH);
  } catch {
    return null;
  }
}

export async function buildPrayerQueleaPdf(items: QueleaPdfItem[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  const logoBytes = loadLogoBytes();
  if (logoBytes) {
    try {
      logo = await pdf.embedPng(logoBytes);
    } catch {
      logo = null;
    }
  }
  const maxNameWidth = PAGE_WIDTH - MARGIN * 2 - (logo ? 280 : 0);
  const maxMsgWidth = PAGE_WIDTH - MARGIN * 2;
  const maxMsgHeight = AVAILABLE_HEIGHT * 0.9;
  for (const item of items) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: LIGHT});
    page.drawRectangle({x: 0, y: HEADER_BOTTOM, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: NAVY});
    if (logo) {
      const logoDims = logo.scale(0.18);
      page.drawImage(logo, {
        x: PAGE_WIDTH - MARGIN - logoDims.width,
        y: HEADER_BOTTOM + (HEADER_HEIGHT - logoDims.height) / 2,
        width: logoDims.width,
        height: logoDims.height,
        opacity: 1,
      });
    }
    const nameFit = fitName(item.name, fontBold, maxNameWidth);
    page.drawText(nameFit.text, {
      x: MARGIN,
      y: HEADER_BOTTOM + (HEADER_HEIGHT - nameFit.fontSize) / 2,
      size: nameFit.fontSize,
      font: fontBold,
      color: WHITE,
    });
    const message = item.message.slice(0, MAX_MESSAGE_CHARS);
    const fit = fitText(message, font, maxMsgWidth, maxMsgHeight, MSG_MAX_START);
    const blockHeight = fit.lines.length * fit.fontSize * 1.2;
    const blockTop = CONTENT_BOTTOM + (AVAILABLE_HEIGHT - blockHeight) / 2 + blockHeight;
    let y = blockTop - fit.fontSize;
    for (const line of fit.lines) {
      page.drawText(line, {x: MARGIN, y, size: fit.fontSize, font, color: NAVY});
      y -= fit.fontSize * 1.2;
    }
    page.drawText(item.createdAt.slice(0, 10), {
      x: MARGIN,
      y: MARGIN * 0.8,
      size: DATE_SIZE,
      font,
      color: NAVY,
    });
  }
  return pdf.save();
}
