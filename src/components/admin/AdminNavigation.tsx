"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

type Item = {href: string; label: string; visible?: boolean};

export function AdminNavigation({roles}: {roles: string[]}) {
  const pathname = usePathname();
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const canManageFinance = isSuperAdmin || roles.includes("TREASURER");
  const items: Item[] = [
    {href: "/admin", label: "Overview"},
    {href: "/admin/users", label: "Users", visible: isSuperAdmin},
    {href: "/admin/visits", label: "Visits"},
    {href: "/admin/template", label: "Website content"},
    {href: "/admin/prayer-requests", label: "Prayer requests"},
    {href: "/admin/ushers", label: "Ushers"},
    {href: "/admin/donations", label: "Donations", visible: canManageFinance},
    {href: "/admin/configs", label: "Settings"},
  ];
  return <nav className="admin-navigation" aria-label="Administration"><p className="admin-navigation-title">Iglesia Plenitud</p><div className="admin-navigation-links">{items.filter((item) => item.visible !== false).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "is-active" : ""}>{item.label}</Link>)}</div></nav>;
}
