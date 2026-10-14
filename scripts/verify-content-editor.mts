import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {CONTENT_CATALOG, REQUIRED_LOCALES, isCatalogKey, isRequiredLocale} from "../src/lib/content-catalog";
import {
  RICH_TEXT_FORMAT,
  findMissingLocales,
  parseTranslationContent,
  renderSafeHtml,
  validateDocument,
} from "../src/lib/content-document";

const root = join(import.meta.dirname, "..");

// Fixed catalog: stable keys only, five required languages, panel in English
assert.deepEqual([...REQUIRED_LOCALES], ["en", "es", "pt", "ko", "de"]);
assert.ok(CONTENT_CATALOG.length >= 8);
assert.deepEqual(
  CONTENT_CATALOG.map((entry) => entry.key),
  ["home.hero", "home.live", "home.community", "home.about", "home.contact", "home.vision", "pastors.intro", "site.footer"],
);
assert.ok(CONTENT_CATALOG.every((entry) => /^[a-z]+\.[a-z]+$/.test(entry.key)));
assert.equal(isCatalogKey("home.hero"), true);
assert.equal(isCatalogKey("custom.anything"), false);
assert.equal(isCatalogKey(null), false);
assert.equal(isRequiredLocale("es"), true);
assert.equal(isRequiredLocale("fr"), false);

// Limited rich text: paragraph, headings, bold, italic, links, lists, quotes
assert.equal(
  renderSafeHtml("# Title\n\nHello **bold** and *italic*."),
  "<h1>Title</h1>\n<p>Hello <strong>bold</strong> and <em>italic</em>.</p>",
);
assert.equal(
  renderSafeHtml("## Sub\n\n- one\n- two\n\n> quoted"),
  "<h2>Sub</h2>\n<ul><li>one</li><li>two</li></ul>\n<blockquote><p>quoted</p></blockquote>",
);
assert.equal(
  renderSafeHtml("See [site](https://example.com/page)."),
  '<p>See <a href="https://example.com/page" rel="noopener noreferrer">site</a>.</p>',
);
assert.equal(validateDocument("# Welcome\n\nSome **text**.").ok, true);

// Prohibited content is rejected, never rendered
for (const bad of [
  '<script>alert("x")</script>',
  "<p>raw html</p>",
  '<iframe src="https://evil.example"></iframe>',
  '<img src="x" onerror="alert(1)">',
  "Click [x](javascript:alert(1))",
  "Go [x](data:text/html,hi)",
  "#### too deep",
  "# ",
]) {
  assert.equal(validateDocument(bad).ok, false, bad);
}
assert.ok(validateDocument("<b>bold</b>").errors.includes("raw_html"));
assert.ok(validateDocument("Click [x](javascript:alert(1))").errors.includes("dangerous_url"));
assert.ok(validateDocument("#### deep").errors.includes("invalid_heading"));
assert.equal(validateDocument("").ok, false);
assert.equal(validateDocument("   ").ok, false);
assert.equal(validateDocument("a".repeat(20001)).ok, false);

// Escaping: hostile input becomes inert text, links stay safe
const hostile = renderSafeHtml('<script>alert(1)</script> & "quotes"');
assert.ok(!hostile.includes("<script>"));
assert.ok(hostile.includes("&lt;script&gt;"));
assert.ok(hostile.includes("&amp;"));
const trickyLink = renderSafeHtml('[a"b](https://example.com/?a=1&b=2)');
assert.ok(trickyLink.includes("&quot;"));
assert.ok(trickyLink.includes("&amp;"));

// Translation shape: fixed format plus valid source
assert.deepEqual(parseTranslationContent({format: RICH_TEXT_FORMAT, source: "# Hi"}), {ok: true, source: "# Hi"});
for (const [input, errors] of [
  [{body: "# Hi"}, ["invalid_format"]],
  [null, ["invalid_shape"]],
  [{format: RICH_TEXT_FORMAT, source: "<b>x</b>"}, ["raw_html"]],
] as const) {
  const parsed = parseTranslationContent(input);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.deepEqual(parsed.errors, errors);
}

// Publish gating: every required language must be present and valid
const full = REQUIRED_LOCALES.map((locale) => ({locale, content: {format: RICH_TEXT_FORMAT, source: `# ${locale}`}}));
assert.deepEqual(findMissingLocales(full), []);
assert.deepEqual(findMissingLocales(full.filter((entry) => entry.locale !== "ko")), ["ko"]);
assert.deepEqual(
  findMissingLocales([{locale: "en", content: {format: RICH_TEXT_FORMAT, source: "<b>x</b>"}}]),
  ["en", "es", "pt", "ko", "de"],
);

// Wiring: fixed catalog is the single source of truth, no arbitrary-key endpoint
const catalogLib = readFileSync(join(root, "src/lib/content-catalog.ts"), "utf8");
assert.match(catalogLib, /single source of truth/);
const contentIndexRoute = readFileSync(join(root, "src/app/api/admin/content/route.ts"), "utf8");
assert.match(contentIndexRoute, /export async function GET/);
assert.match(contentIndexRoute, /requireMinistryManager/);
assert.ok(!contentIndexRoute.includes("export async function POST"));
assert.ok(!contentIndexRoute.includes("contentBlock.create"));

// Wiring: mutations require session, ministry-manager role and public origin
for (const routePath of [
  "src/app/api/admin/content/[id]/translations/route.ts",
  "src/app/api/admin/content/[id]/publish/route.ts",
  "src/app/api/admin/content/[id]/unpublish/route.ts",
  "src/app/api/admin/content/[id]/restore/route.ts",
]) {
  const route = readFileSync(join(root, routePath), "utf8");
  assert.match(route, /requireMinistryManager/);
  assert.match(route, /hasValidPublicOrigin/);
}

// Wiring: publish blocked until complete, revisions on save/publish/restore, restore confirmed
const publishRoute = readFileSync(join(root, "src/app/api/admin/content/[id]/publish/route.ts"), "utf8");
assert.match(publishRoute, /findMissingLocales/);
assert.match(publishRoute, /incomplete_translations/);
assert.match(publishRoute, /action: "published"/);
assert.match(publishRoute, /CONTENT_BLOCK_PUBLISHED/);
// Publish promotes the five valid drafts explicitly, never live content
assert.match(publishRoute, /data: \{published:/);
assert.ok(!publishRoute.includes("updateMany"));
// Saving writes the draft only; the published version is untouched
const translationsRoute = readFileSync(join(root, "src/app/api/admin/content/[id]/translations/route.ts"), "utf8");
assert.match(translationsRoute, /invalid_document/);
assert.match(translationsRoute, /action: "saved"/);
assert.match(translationsRoute, /CONTENT_TRANSLATION_SAVED/);
assert.match(translationsRoute, /update: \{draft\}/);
assert.ok(!translationsRoute.includes("published:"));
// Unpublish retires the live version only; drafts and revisions survive
const unpublishRoute = readFileSync(join(root, "src/app/api/admin/content/[id]/unpublish/route.ts"), "utf8");
assert.match(unpublishRoute, /published: Prisma\.DbNull/);
assert.match(unpublishRoute, /CONTENT_BLOCK_UNPUBLISHED/);
assert.ok(!unpublishRoute.includes("contentRevision.create"));
assert.ok(!unpublishRoute.includes("deleteMany"));
// Restore lands on the draft only; publishing stays a later explicit step
const restoreRoute = readFileSync(join(root, "src/app/api/admin/content/[id]/restore/route.ts"), "utf8");
assert.match(restoreRoute, /confirmation_required/);
assert.match(restoreRoute, /unrestorable_revision/);
assert.match(restoreRoute, /action: "restored"/);
assert.match(restoreRoute, /CONTENT_REVISION_RESTORED/);
assert.match(restoreRoute, /update: \{draft\}/);
assert.ok(!restoreRoute.includes("published:"));
// Public reads serve the published column only
const repository = readFileSync(join(root, "src/lib/content/repository.ts"), "utf8");
assert.match(repository, /select: \{published: true\}/);
assert.ok(!repository.includes("draft"));

// Wiring: page guards content role, UI covers catalog, preview, missing, revisions
const contentPage = readFileSync(join(root, "src/app/admin/content/page.tsx"), "utf8");
assert.match(contentPage, /canViewContent/);
assert.match(contentPage, /ContentManager/);
const manager = readFileSync(join(root, "src/components/admin/ContentManager.tsx"), "utf8");
assert.match(manager, /Missing:/);
assert.match(manager, /Review &amp; publish/);
assert.match(manager, /dangerouslySetInnerHTML/);
assert.match(manager, /Revision history/);
assert.match(manager, /Restore/);
assert.match(manager, /Published version/);
assert.match(manager, /\/api\/admin\/content/);
// Valid React sync: key-remounted editor plus server refresh, no render-time setState
assert.ok(!manager.includes("useEffect"));
assert.ok(!manager.includes("initializedFor"));
assert.match(manager, /key=\{`/);
assert.match(manager, /setEditorKey/);

// Migration: revision language/action columns plus seeded catalog, legacy-safe
const migration = readFileSync(join(root, "prisma/migrations/20261016000000_content_editor_workflow/migration.sql"), "utf8");
assert.match(migration, /ADD COLUMN "locale"/);
assert.match(migration, /ADD COLUMN "action"/);
assert.match(migration, /home\.hero/);
assert.match(migration, /ON CONFLICT \("key"\) DO NOTHING/);
assert.match(migration, /"created_at", "updated_at"/);
assert.match(migration, /NOW\(\), NOW\(\)/);
// Split migration: rename preserves data, published backfilled only for live blocks
const splitMigration = readFileSync(join(root, "prisma/migrations/20261016010000_content_draft_published_split/migration.sql"), "utf8");
assert.match(splitMigration, /RENAME COLUMN "content" TO "draft"/);
assert.match(splitMigration, /ADD COLUMN "published"/);
assert.match(splitMigration, /b\."status" = 'PUBLISHED'/);
assert.ok(!splitMigration.toUpperCase().includes("DELETE"));
assert.ok(!splitMigration.includes("DROP COLUMN"));

console.log("verify-content-editor: all checks passed");
console.log("  - Fixed catalog with stable keys; no arbitrary-key creation");
console.log("  - Limited markup (paragraph, headings, bold, italic, links, lists, quotes) with safe HTML output");
console.log("  - Raw HTML, scripts, iframes and unsafe links rejected and escaped");
console.log("  - Drafts never touch published content; publish promotes the five valid drafts explicitly");
console.log("  - Unpublish retires live content only; restore lands on the draft only");
console.log("  - Publishing blocked until all five languages are present and valid");
console.log("  - Immutable revisions on save/publish/restore; confirmed restore with audit");
console.log("  - Session, ministry-manager role and public origin on every mutation");
console.log("  - UI refreshes from the server with key-remount sync, no render-time setState");
