import type {AdminMessages} from "@/i18n/admin-shell";

export type AdminCrumb = {href: string; label: string};

/**
 * Builds a breadcrumb trail from known admin routes only.
 * Unknown path segments are omitted — slugs are never auto-capitalized.
 */
export function adminCrumbs(pathname: string, labels: Record<string, string>, rootLabel: string): AdminCrumb[] {
  if (pathname === "/admin" || pathname === "/admin/") return [{href: "/admin", label: rootLabel}];
  const head = pathname.split("?")[0].replace(/\/+$/, "");
  const segments = head.split("/").filter(Boolean);
  const trail: AdminCrumb[] = [{href: "/admin", label: rootLabel}];
  let href = "";
  for (const segment of segments) {
    href += `/${segment}`;
    if (href === "/admin") continue;
    const label = labels[href];
    if (label) trail.push({href, label});
  }
  return trail;
}

export function formatAdminTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

/**
 * Header title derived from the bilingual catalogue.
 * Overview keeps a translated greeting; other routes use the known-route label.
 */
export function adminPageTitle(pathname: string, messages: AdminMessages, userName?: string | null): string {
  const head = pathname.split("?")[0].replace(/\/+$/, "") || "/admin";
  if (head === "/admin") {
    const name = userName?.trim();
    return name ? formatAdminTemplate(messages.header.welcome, {name}) : messages.navigation.overview;
  }
  const segments = head.split("/").filter(Boolean);
  let href = "";
  let label: string | undefined;
  for (const segment of segments) {
    href += `/${segment}`;
    if (href === "/admin") continue;
    const candidate = messages.breadcrumbs.labels[href];
    if (candidate) label = candidate;
  }
  return label ?? messages.navigation.overview;
}
