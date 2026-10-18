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
