import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {
  ADMIN_LANGUAGE_COOKIE,
  DEFAULT_ADMIN_LOCALE,
  adminLocales,
  adminMessages,
  resolveAdminLocale,
} from "../src/i18n/admin-shell";
import {adminCrumbs} from "../src/lib/admin-navigation";

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
  "src/app/admin/content/page.tsx",
  "src/app/admin/prayer-requests/page.tsx",
  "src/app/admin/users/page.tsx",
  "src/app/admin/configs/page.tsx",
  "src/app/admin/notifications/page.tsx",
]) {
  check(read(page).includes("AdminFrame"), `B: ${page} uses the shared AdminFrame shell`);
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
