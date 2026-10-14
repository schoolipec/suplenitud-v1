export const REQUIRED_LOCALES = ["en", "es", "pt", "ko", "de"] as const;
export type RequiredLocale = (typeof REQUIRED_LOCALES)[number];

export type ContentCatalogEntry = {
  key: string;
  type: string;
  displayOrder: number;
  label: string;
  description: string;
};

/**
 * Fixed editorial catalog with stable keys. New keys are never created from
 * the UI: blocks are seeded by migration and the arbitrary-key create endpoint
 * was removed. Keep this list as the single source of truth.
 */
export const CONTENT_CATALOG: readonly ContentCatalogEntry[] = [
  {key: "home.hero", type: "hero", displayOrder: 10, label: "Home · Hero", description: "Main headline section of the home page."},
  {key: "home.live", type: "section", displayOrder: 20, label: "Home · Live", description: "Live service callout on the home page."},
  {key: "home.community", type: "section", displayOrder: 30, label: "Home · Community", description: "Community invitation section."},
  {key: "home.about", type: "section", displayOrder: 40, label: "Home · About", description: "About the church section."},
  {key: "home.contact", type: "section", displayOrder: 50, label: "Home · Contact", description: "Visit and contact section."},
  {key: "home.vision", type: "section", displayOrder: 60, label: "Home · Vision", description: "Vision statement section."},
  {key: "pastors.intro", type: "section", displayOrder: 70, label: "Pastors · Intro", description: "Introduction of the pastors page."},
  {key: "site.footer", type: "section", displayOrder: 80, label: "Site · Footer", description: "Shared footer texts."},
];

export function isCatalogKey(key: unknown): boolean {
  return typeof key === "string" && CONTENT_CATALOG.some((entry) => entry.key === key);
}

export function isRequiredLocale(locale: unknown): locale is RequiredLocale {
  return typeof locale === "string" && (REQUIRED_LOCALES as readonly string[]).includes(locale);
}
