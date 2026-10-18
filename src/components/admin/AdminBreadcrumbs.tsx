"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import {adminCrumbs} from "@/lib/admin-navigation";

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const {t} = useAdminShell();
  const crumbs = adminCrumbs(pathname, t.breadcrumbs.labels, t.breadcrumbs.root);
  return (
    <nav className="admin-breadcrumbs" aria-label={t.navigation.aria}>
      <ol>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href}>
              {isLast ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
