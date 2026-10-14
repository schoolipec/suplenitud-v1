import {REQUIRED_LOCALES, type RequiredLocale} from "@/lib/content-catalog";

export const RICH_TEXT_FORMAT = "limited-richtext-v1";
export const MAX_SOURCE_LENGTH = 20000;
export const MAX_LINE_LENGTH = 2000;

export type TranslationRecord = {locale: string; content: unknown};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMarks(text: string): string {
  const escaped = escapeHtml(text);
  const withBold = escaped.replace(/\*\*([^\n*]+)\*\*/g, (_match, inner: string) => `<strong>${inner}</strong>`);
  return withBold.replace(/(?<!\*)\*([^\n*]+)\*(?!\*)/g, (_match, inner: string) => `<em>${inner}</em>`);
}

function renderInline(text: string): string {
  const linkPattern = /\[([^\[\]\n]+)\]\((https?:\/\/[^\s<>"']+)\)/gi;
  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(text)) !== null) {
    result += renderMarks(text.slice(cursor, match.index));
    result += `<a href="${escapeHtml(match[2])}" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`;
    cursor = match.index + match[0].length;
  }
  result += renderMarks(text.slice(cursor));
  return result;
}

type Block =
  | {kind: "heading"; level: 1 | 2 | 3; text: string}
  | {kind: "quote"; text: string}
  | {kind: "list"; items: string[]}
  | {kind: "paragraph"; text: string};

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim()});
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        parts.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({kind: "quote", text: parts.join(" ").trim()});
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, "").trim());
        index += 1;
      }
      blocks.push({kind: "list", items});
      continue;
    }
    const parts: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index])
    ) {
      parts.push(lines[index].trim());
      index += 1;
    }
    blocks.push({kind: "paragraph", text: parts.join(" ")});
  }
  return blocks;
}

/** Render limited markup to safe HTML. Output contains only allowlisted tags. */
export function renderSafeHtml(source: string): string {
  const html: string[] = [];
  for (const block of parseBlocks(source)) {
    if (block.kind === "heading") {
      const tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
      html.push(`<${tag}>${renderInline(block.text)}</${tag}>`);
    } else if (block.kind === "quote") {
      html.push(`<blockquote><p>${renderInline(block.text)}</p></blockquote>`);
    } else if (block.kind === "list") {
      html.push(`<ul>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
    } else {
      html.push(`<p>${renderInline(block.text)}</p>`);
    }
  }
  return html.join("\n");
}

const RAW_HTML_PATTERN = /<[A-Za-z!/]/;
const DANGEROUS_SCHEME_PATTERN = /(javascript|vbscript|data)\s*:/i;
const BAD_LINK_PATTERN = /\[[^\[\]\n]*\]\((?![Hh][Tt][Tt][Pp][Ss]?:\/\/)[^)\s]*\)/;

export function validateDocument(source: unknown): {ok: boolean; errors: string[]} {
  const errors: string[] = [];
  if (typeof source !== "string" || source.trim().length === 0) {
    return {ok: false, errors: ["empty"]};
  }
  if (source.length > MAX_SOURCE_LENGTH) errors.push("too_long");
  for (const line of source.split("\n")) {
    if (line.length > MAX_LINE_LENGTH) {
      errors.push("line_too_long");
      break;
    }
    if (/^#{4,}\s/.test(line) || /^#{1,3}\s*$/.test(line)) errors.push("invalid_heading");
    if (RAW_HTML_PATTERN.test(line)) errors.push("raw_html");
  }
  if (DANGEROUS_SCHEME_PATTERN.test(source)) errors.push("dangerous_url");
  if (BAD_LINK_PATTERN.test(source)) errors.push("invalid_link");
  return {ok: errors.length === 0, errors: [...new Set(errors)]};
}

export function parseTranslationContent(content: unknown): {ok: boolean; source?: string; errors?: string[]} {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return {ok: false, errors: ["invalid_shape"]};
  }
  const record = content as Record<string, unknown>;
  if (record.format !== RICH_TEXT_FORMAT) return {ok: false, errors: ["invalid_format"]};
  const validation = validateDocument(record.source);
  if (!validation.ok) return {ok: false, errors: validation.errors};
  return {ok: true, source: record.source as string};
}

/** Required locales without a present, valid translation. Publishing is blocked while non-empty. */
export function findMissingLocales(records: TranslationRecord[]): RequiredLocale[] {
  const valid = new Set<string>();
  for (const record of records) {
    if (parseTranslationContent(record.content).ok) valid.add(record.locale);
  }
  return (REQUIRED_LOCALES as readonly string[]).filter((locale) => !valid.has(locale)) as RequiredLocale[];
}
