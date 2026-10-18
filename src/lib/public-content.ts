import {getPublishedContent} from "@/lib/content/repository";
import {parseTranslationContent, renderSafeHtml} from "@/lib/content-document";
import {CONTENT_CATALOG, REQUIRED_LOCALES} from "@/lib/content-catalog";

/**
 * Public content bindings. Server-only: this module is imported from server
 * components only and never from client components. Each public section slot
 * maps to an existing catalog key; new keys are never invented here. Sections
 * without a binding (for example the static footer and the schedule line) keep
 * their approved static copy. Only published content is ever read, so
 * unpublishing a block restores the static fallback with unsaved work preserved.
 */
export const PUBLIC_CONTENT_SECTIONS = {
  homeHero: "home.hero",
  homeLive: "home.live",
  homeCommunity: "home.community",
  homeAbout: "home.about",
  homeContact: "home.contact",
  homeVision: "home.vision",
  pastorsIntro: "pastors.intro",
} as const;

export type PublicContentSection = keyof typeof PUBLIC_CONTENT_SECTIONS;
export type PublicContent = Partial<Record<PublicContentSection, string>>;

/** Catalog keys are the single source of truth; bindings never create keys. */
const catalogKeys = new Set(CONTENT_CATALOG.map((entry) => entry.key));

function isRequiredLocale(locale: string): boolean {
  return (REQUIRED_LOCALES as readonly string[]).includes(locale);
}

/**
 * Resolves one slot to safe HTML: the requested locale first, then the English
 * default, then nothing. Unpublished content is unreachable because the
 * repository reads the published column only.
 */
async function resolveSection(key: string, locale: string): Promise<string | null> {
  const published = (await getPublishedContent(key, locale)) ?? (locale === "en" ? null : await getPublishedContent(key, "en"));
  if (published === null || published === undefined) return null;
  const parsed = parseTranslationContent(published);
  return parsed.ok ? renderSafeHtml(parsed.source) : null;
}

/**
 * Published, sanitized HTML for every bound public section. Returns an empty
 * record for unknown locales or when no block is published, so callers always
 * fall back to the static copy.
 */
export async function loadPublicContent(locale: string): Promise<PublicContent> {
  if (!isRequiredLocale(locale)) return {};
  const bindings = (Object.entries(PUBLIC_CONTENT_SECTIONS) as [PublicContentSection, string][]).filter(([, key]) => catalogKeys.has(key));
  const resolved = await Promise.all(bindings.map(async ([section, key]) => [section, await resolveSection(key, locale)] as const));
  const content: PublicContent = {};
  for (const [section, html] of resolved) {
    if (html !== null) content[section] = html;
  }
  return content;
}
