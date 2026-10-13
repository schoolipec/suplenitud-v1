"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useState} from "react";
import {authClient} from "@/lib/auth-client";

type Item = {href: string; label: string; visible?: boolean};

export function AdminNavigation({roles}: {roles: string[]}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isSuperOrAdmin = isSuperAdmin || roles.includes("ADMIN");
  const items: Item[] = [
    {href: "/admin", label: "Overview"},
    {href: "/admin/users", label: "Users", visible: isSuperAdmin},
    {href: "/admin/visits", label: "Visits", visible: isSuperOrAdmin},
    {href: "/admin/template", label: "Website content", visible: isSuperOrAdmin},
    {href: "/admin/prayer-requests", label: "Prayer requests", visible: isSuperOrAdmin},
    {href: "/admin/ushers", label: "Ushers", visible: isSuperOrAdmin},
    {href: "/admin/donations", label: "Donations", visible: isSuperAdmin || roles.includes("TREASURER")},
    {href: "/admin/configs", label: "Settings"},
  ];
  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/admin/sign-in");
    router.refresh();
  }
  return <nav className="admin-navigation" aria-label="Administration"><p className="admin-navigation-title">Iglesia Plenitud</p><div className="admin-navigation-links">{items.filter((item) => item.visible !== false).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "is-active" : ""}>{item.label}</Link>)}</div><button type="button" className="admin-sign-out" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></nav>;
}
