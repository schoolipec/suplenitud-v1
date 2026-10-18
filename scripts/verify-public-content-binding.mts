import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {CONTENT_CATALOG} from "../src/lib/content-catalog";
import {parseTranslationContent, renderSafeHtml, RICH_TEXT_FORMAT} from "../src/lib/content-document";

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const loader = read("src/lib/public-content.ts");
const component = read("src/components/site/PublishedCopy.tsx");
const home = read("src/app/page.tsx");
const pastors = read("src/app/pastors/page.tsx");
const localeHome = read("src/app/[locale]/page.tsx");
const localePastors = read("src/app/[locale]/pastors/page.tsx");
const repository = read("src/lib/content/repository.ts");

// Bindings reuse the fixed catalog: no keys invented, no key left unmatched.
const catalogKeys = CONTENT_CATALOG.map((entry) => entry.key);
const boundKeys = ["home.hero", "home.live", "home.community", "home.about", "home.contact", "home.vision", "pastors.intro"];
assert.match(loader, /export const PUBLIC_CONTENT_SECTIONS = \{/);
for (const key of boundKeys) {
  assert.ok(loader.includes(`"${key}"`), `missing binding for ${key}`);
  assert.ok(catalogKeys.includes(key), `${key} is not a catalog key`);
}
assert.equal(loader.includes('"site.footer"'), false, "the static footer stays unbound");
assert.match(loader, /CONTENT_CATALOG/);
assert.match(loader, /REQUIRED_LOCALES/);

// Only published content is read; no admin internals and no direct database access.
assert.match(loader, /import \{getPublishedContent\} from "@\/lib\/content\/repository"/);
assert.match(loader, /export async function loadPublicContent/);
assert.match(loader, /parseTranslationContent/);
assert.match(loader, /renderSafeHtml/);
assert.equal(/draft/i.test(loader), false, "the public loader must never touch drafts");
assert.equal(loader.includes("prisma"), false, "the public loader reads through the published repository only");

// The renderer injects sanitized HTML and keeps the approved fallback otherwise.
assert.match(component, /export function PublishedCopy/);
assert.match(component, /dangerouslySetInnerHTML=\{\{__html: html\}\}/);
assert.match(component, /className="cms-copy"/);
assert.match(component, /if \(!html\) return <>\{fallback\}<\/>;/);
assert.equal(component.includes('"use client"'), false, "published copy renders on the server");

// Home binds six sections, pastors its intro, both awaiting the shared loader.
assert.equal((home.match(/<PublishedCopy/g) ?? []).length, 6);
assert.match(home, /import \{loadPublicContent\} from "@\/lib\/public-content"/);
assert.match(home, /export default async function Home/);
assert.match(home, /const content = await loadPublicContent\(locale\)/);
assert.equal((pastors.match(/<PublishedCopy/g) ?? []).length, 1);
assert.match(pastors, /const content = await loadPublicContent\(locale\)/);

// Publishing must reflect without a rebuild. Cache Components forbids the
// `dynamic` route config and prerenders anything cacheable, so each public
// route opts into per-request (blocking) rendering with `instant = false`.
for (const [route, source] of [["/", home], ["/pastors", pastors], ["/[locale]", localeHome], ["/[locale]/pastors", localePastors]] as const) {
  assert.match(source, /export const instant = false;/, route);
  assert.equal(source.includes('export const dynamic ='), false, `${route} must not use the dynamic config`);
  assert.equal(source.includes("connection("), false, `${route} relies on instant = false, not connection()`);
}

// Sanitization still gates the public HTML: safe limited markup renders, hostile input never does.
const safe = parseTranslationContent({format: RICH_TEXT_FORMAT, source: "# Hello **world**"});
assert.equal(safe.ok, true);
if (safe.ok) assert.equal(renderSafeHtml(safe.source), "<h1>Hello <strong>world</strong></h1>");
assert.equal(parseTranslationContent({format: RICH_TEXT_FORMAT, source: "<script>alert(1)</script>"}).ok, false);
assert.equal(renderSafeHtml("[x](javascript:alert(1))").includes("<a "), false);

// No public API surface is added; content keeps flowing through the published repository.
assert.equal(existsSync(join(root, "src/app/api/public")), false);
assert.match(read("src/app/api/admin/content/route.ts"), /export async function GET/);

// No admin-only internals leak into any public binding artifact.
for (const source of [loader, component, home, pastors]) {
  assert.equal(/ContentRevision|blockId|revisions|drafts/.test(source), false);
}

// The public repository still reads the published column only.
assert.match(repository, /select: \{published: true\}/);

console.log("verify-public-content-binding: all checks passed");
console.log("  - Published blocks bind to existing catalog keys only; no arbitrary keys");
console.log("  - Public sections read published content through the safe repository, never drafts");
console.log("  - Unpublished or missing blocks fall back to the approved static copy");
console.log("  - Published HTML is sanitized by the limited-markup renderer before injection");
console.log("  - Home and pastors routes render dynamically so publishing reflects without a rebuild");
console.log("  - No public API is added and no admin internals leak into the public pages");
