import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {
  ADMIN_LANGUAGE_COOKIE,
  DEFAULT_ADMIN_LOCALE,
  adminLocales,
  adminMessages,
  resolveAdminLocale,
} from "../src/i18n/admin-shell";
import {adminCrumbs, adminPageTitle, formatAdminTemplate} from "../src/lib/admin-navigation";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

let ok = true;
const errors: string[] = [];
function check(cond: boolean, msg: string) {
  if (!cond) {
    ok = false;
    errors.push(msg);
  }
}
function eq(actual: unknown, expected: unknown, msg: string) {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}

const sidebar = read("src/components/admin/AdminSidebar.tsx");
const dashboard = read("src/app/admin/page.tsx");
const templatePage = read("src/app/admin/template/page.tsx");
const header = read("src/components/admin/AdminHeader.tsx");
const frame = read("src/components/admin/AdminFrame.tsx");
const breadcrumbs = read("src/components/admin/AdminBreadcrumbs.tsx");
const userMenu = read("src/components/admin/AdminUserMenu.tsx");
const popover = read("src/components/admin/AdminNotificationsPopover.tsx");
const langRoute = read("src/app/api/admin/language/route.ts");
const notificationsApi = read("src/app/api/admin/notifications/route.ts");
const publicHeader = read("src/components/site/Header.tsx");
const publicFooter = read("src/components/site/Footer.tsx");

/* A. Admin route correction */
check(sidebar.includes('href: "/admin/content"'), "A: sidebar must link to /admin/content");
check(!sidebar.includes("/admin/template"), "A: sidebar must not link to /admin/template");
check(dashboard.includes('href="/admin/content"'), "A: dashboard card must link to /admin/content");
check(!dashboard.includes("/admin/template"), "A: dashboard must not link to /admin/template");
check(templatePage.includes('redirect("/admin/content")'), "A: /admin/template stays a passive redirect to /admin/content");

/* A2. Sidebar grouping: Visits belongs to Main */
const mainIndex = sidebar.indexOf('key: "main"');
const visitsIndex = sidebar.indexOf("/admin/visits");
const ministryIndex = sidebar.indexOf('key: "ministry"');
check(visitsIndex >= 0, "A2: Visits stays in the sidebar");
eq((sidebar.match(/\/admin\/visits/g) ?? []).length, 1, "A2: Visits appears in exactly one group");
check(mainIndex >= 0 && visitsIndex > mainIndex && visitsIndex < ministryIndex, "A2: Visits is grouped under Main");
check(sidebar.includes('href: "/admin/visits"'), "A2: Visits keeps its route");

/* B. Professional admin shell */
check(sidebar.includes("authClient.signOut()"), "B: sign out reuses authClient.signOut");
check(/router\.replace\("\/"\)/.test(sidebar), 'B: sidebar sign out lands on "/"');
check(!sidebar.includes('router.replace("/admin/sign-in")'), "B: sign out never lands on /admin/sign-in");
check(sidebar.includes("admin-nav-panel"), "B: mobile drawer panel preserved");
check(sidebar.includes('id="admin-nav-panel"'), "B: mobile drawer keeps its target id");
check(sidebar.includes("aria-expanded={menuOpen}"), "B: mobile drawer toggle keeps aria-expanded");
check(sidebar.includes("admin-nav-overlay"), "B: mobile drawer overlay preserved");
check(sidebar.includes("admin-navigation-group-title"), "B: sidebar renders grouped sections");
check(breadcrumbs.includes("adminCrumbs"), "B: breadcrumbs use the known-route helper");
check(userMenu.includes("/admin/configs") && userMenu.includes("/admin/security") && userMenu.includes("/admin/notifications"), "B: user menu links to profile, security and alerts");
check(userMenu.includes("admin-menu-roles"), "B: user menu shows role labels");
check(/router\.replace\("\/"\)/.test(userMenu), 'B: user menu sign out lands on "/"');
check(/if \(isAdmin\) return null/.test(publicHeader), "B: public header self-suppresses on /admin");
check(publicFooter.includes('path.startsWith("/admin/")'), "B: public footer self-suppresses on /admin");
for (const page of [
  "src/app/admin/page.tsx",
  "src/app/admin/content/page.tsx",
  "src/app/admin/prayer-requests/page.tsx",
  "src/app/admin/users/page.tsx",
  "src/app/admin/configs/page.tsx",
  "src/app/admin/notifications/page.tsx",
  "src/app/admin/ministry-contacts/page.tsx",
  "src/app/admin/donations/page.tsx",
  "src/app/admin/visits/page.tsx",
  "src/app/admin/usher-availability/page.tsx",
]) {
  const source = read(page);
  check(source.includes("AdminFrame"), `B: ${page} uses the shared AdminFrame shell`);
  check(!source.includes("title="), `B: ${page} no longer passes a fixed title to AdminFrame`);
}

/* C. Bilingual admin language base (English default, Spanish optional) */
eq(DEFAULT_ADMIN_LOCALE, "en", "C: default admin locale is English");
eq([...adminLocales].sort(), ["en", "es"], "C: only en and es admin locales");
function collectKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => collectKeys(child, `${prefix}.${key}`))
    .sort();
}
eq(collectKeys(adminMessages.en), collectKeys(adminMessages.es), "C: en/es messages have identical keys");
check(!collectKeys(adminMessages.en).some((key) => key.endsWith(".")), "C: no empty message keys");
eq(resolveAdminLocale(undefined), "en", "C: missing preference resolves to English");
eq(resolveAdminLocale("zz"), "en", "C: unknown preference resolves to English");
eq(resolveAdminLocale("es"), "es", "C: Spanish preference resolves to Spanish");
check(langRoute.includes("ADMIN_LANGUAGE_COOKIE"), "C: language route writes the admin cookie");
check(langRoute.includes("isAdminLocale(locale)"), "C: language route validates the value");
check(langRoute.includes("httpOnly: true"), "C: language cookie is httpOnly");
check(langRoute.includes("sameSite") && langRoute.includes("maxAge"), "C: language cookie is persistent and sameSite");
eq(ADMIN_LANGUAGE_COOKIE, "ipec-admin-language", "C: dedicated admin cookie (does not touch public i18n)");
check(frame.includes("await cookies()"), "C: shell reads language from a cookie server-side");
check(!frame.includes('"use client"'), "C: AdminFrame is a server component");
check(!frame.includes("searchParams"), "C: language never comes from query params");
check(breadcrumbs.includes("useAdminShell") && sidebar.includes("useAdminShell") && userMenu.includes("useAdminShell") && popover.includes("useAdminShell"), "C: shell client components read strings from the message catalogue");

/* C2. Language endpoint security (origin + admin session) */
check(langRoute.includes("hasValidPublicOrigin(request)"), "C2: language route validates origin with the canonical helper");
check(langRoute.includes("requireAdminActor(request)"), "C2: language route requires an admin session guard");
check(langRoute.includes("import {requireAdminActor} from \"@/lib/access\""), "C2: language route reuses the shared access guard, not a bypass");
eq((langRoute.match(/status: 403/g) ?? []).length, 2, "C2: language route answers 403 for invalid origin and unauthorized session");
check(langRoute.indexOf("requireAdminActor(request)") < langRoute.indexOf("cookies.set"), "C2: authorization runs before the cookie is written");
check(!/requireAdminActor\([^)]*\)\s*\?\s*true/.test(langRoute), "C2: no hardcoded authz bypass");
check(langRoute.includes("httpOnly: true") && langRoute.includes("sameSite") && langRoute.includes("maxAge"), "C2: language cookie stays httpOnly, sameSite and persistent");

/* C3. Bilingual shell: header title follows the chosen language */
eq(adminMessages.en.header.welcome, "Welcome, {name}", "C3: English greeting template");
eq(adminMessages.es.header.welcome, "Bienvenido, {name}", "C3: Spanish greeting template");
eq(formatAdminTemplate(adminMessages.en.header.welcome, {name: "Ana"}), "Welcome, Ana", "C3: greeting interpolation (en)");
eq(adminPageTitle("/admin", adminMessages.en, "Ana"), "Welcome, Ana", "C3: Overview greets in English");
eq(adminPageTitle("/admin", adminMessages.es, "Ana"), "Bienvenido, Ana", "C3: Overview greets in Spanish");
eq(adminPageTitle("/admin", adminMessages.es, null), "Resumen", "C3: Overview falls back to the localized label without a name");
eq(adminPageTitle("/admin/content", adminMessages.en), "Website content", "C3: route title in English");
eq(adminPageTitle("/admin/content", adminMessages.es), "Contenido del sitio", "C3: route title in Spanish");
eq(adminPageTitle("/admin/visits", adminMessages.es), "Visitas", "C3: Visits title in Spanish");
eq(adminPageTitle("/admin/prayer-requests/print", adminMessages.es), "Peticiones de oración", "C3: nested route title in Spanish");
check(header.includes("useAdminShell") && header.includes("adminPageTitle"), "C3: header derives its title from the bilingual catalogue");
check(header.includes("userName"), "C3: header receives the user name for the greeting");
check(!/title=/.test(frame), "C3: AdminFrame no longer receives fixed titles");

/* D. Environment badge and notifications popover */
check(frame.includes("process.env.ADMIN_ENVIRONMENT"), "D: environment badge comes from a server env var");
check(!frame.includes("NEXT_PUBLIC_"), "D: environment badge is not a public env value");
check(/ADMIN_ENVIRONMENT === "demo"/.test(frame), 'D: "Demo" only when the server confirms it');
check(popover.includes("/api/admin/notifications"), "D: notifications popover uses the existing API");
check(!/prayerRequest\b/.test(popover), "D: popover never reads the prayer request body");
check(!/\bmessage\b/.test(popover), "D: popover never reads message content");
check(header.includes("canViewNotifications ?") && header.includes("AdminNotificationsPopover"), "D: popover is permission-gated");
check(frame.includes("canViewPrayerRequests"), "D: shell derives permission from the canonical access helper");
check(notificationsApi.includes("requireMinistryManager"), "D: notifications API stays authorized behind requireMinistryManager");
check(notificationsApi.includes("select: {id: true, name: true, status: true, requestType: true}"), "D: notifications API select excludes the prayer message body");
check(!/setInterval|setTimeout/.test(popover), "D: popover does not poll");

/* E. Permissions preserved */
check(sidebar.includes('roles.includes("SUPER_ADMIN")'), "E: SUPER_ADMIN still gates the sidebar");
check(sidebar.includes('roles.includes("ADMIN")'), "E: ADMIN role gating preserved");
check(sidebar.includes('roles.includes("TREASURER")'), "E: TREASURER still gates donations");
check(sidebar.includes('href: "/admin/users"') && sidebar.includes("visible: isSuperAdmin"), "E: Users stays SUPER_ADMIN only");

/* Functional: breadcrumbs from known routes only */
const rootLabel = adminMessages.en.breadcrumbs.root;
const labels = adminMessages.en.breadcrumbs.labels;
eq(adminCrumbs("/admin", labels, rootLabel), [{href: "/admin", label: "Administration"}], "Breadcrumb: /admin");
eq(
  adminCrumbs("/admin/content", labels, rootLabel),
  [{href: "/admin", label: "Administration"}, {href: "/admin/content", label: "Website content"}],
  "B: breadcrumb uses the readable label for /admin/content",
);
eq(adminCrumbs("/admin/unknown-slug", labels, rootLabel), [{href: "/admin", label: "Administration"}], "B: unknown slug is omitted, never capitalized");
eq(adminCrumbs("/admin/prayer-requests/print", labels, rootLabel), [
  {href: "/admin", label: "Administration"},
  {href: "/admin/prayer-requests", label: "Prayer requests"},
], "B: nested routes only show known labels");

if (!ok) {
  console.error("verify-admin-shell: FAILED");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}
console.log("verify-admin-shell: all checks passed");
console.log("  - Admin links point to /admin/content; /admin/template stays a passive redirect");
console.log("  - Shell: grouped sidebar, breadcrumbs, user menu, mobile drawer, public header/footer hidden");
console.log("  - Bilingual (en default, es optional) via a dedicated httpOnly cookie; no query params");
console.log("  - Demo badge from server env only; notifications popover uses existing API, permission-gated");
