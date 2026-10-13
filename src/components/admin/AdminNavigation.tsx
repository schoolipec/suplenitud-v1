"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useEffect, useRef, useState} from "react";
import {authClient} from "@/lib/auth-client";
import {
  IconArticle,
  IconChartBar,
  IconHeartHandshake,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconPray,
  IconSettings,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";

type Item = {href: string; label: string; icon: typeof IconUsers; visible?: boolean};

export function AdminNavigation({roles}: {roles: string[]}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isSuperOrAdmin = isSuperAdmin || roles.includes("ADMIN");
  const items: Item[] = [
    {href: "/admin", label: "Overview", icon: IconLayoutDashboard},
    {href: "/admin/users", label: "Users", icon: IconUsers, visible: isSuperAdmin},
    {href: "/admin/visits", label: "Visits", icon: IconChartBar, visible: isSuperOrAdmin},
    {href: "/admin/template", label: "Website content", icon: IconArticle, visible: isSuperOrAdmin},
    {href: "/admin/prayer-requests", label: "Prayer requests", icon: IconPray, visible: isSuperOrAdmin},
    {href: "/admin/ushers", label: "Ushers", icon: IconUsersGroup, visible: isSuperOrAdmin},
    {href: "/admin/donations", label: "Donations", icon: IconHeartHandshake, visible: isSuperAdmin || roles.includes("TREASURER")},
    {href: "/admin/configs", label: "Settings", icon: IconSettings},
  ].filter((item) => item.visible !== false);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/admin/sign-in");
    router.refresh();
  }

  return (
    <nav className="admin-navigation" aria-label="Administration">
      <div className="admin-mobile-bar">
        <button
          ref={toggleRef}
          type="button"
          className="admin-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="admin-nav-panel"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <IconX size={22} aria-hidden /> : <IconMenu2 size={22} aria-hidden />}
          <span className="admin-sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
        <p className="admin-mobile-brand">Iglesia Plenitud</p>
        <button type="button" className="admin-mobile-sign-out" onClick={signOut} disabled={signingOut}>
          <IconLogout size={20} aria-hidden />
          <span className="admin-sr-only">{signingOut ? "Signing out" : "Sign out"}</span>
        </button>
      </div>
      {menuOpen ? <button type="button" className="admin-nav-overlay" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} /> : null}
      <div ref={panelRef} id="admin-nav-panel" className={menuOpen ? "admin-nav-panel is-open" : "admin-nav-panel"}>
        <p className="admin-navigation-title">Iglesia Plenitud</p>
        <div className="admin-navigation-links">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={pathname === item.href ? "is-active" : ""} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                <Icon size={19} stroke={1.75} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <button type="button" className="admin-sign-out" onClick={signOut} disabled={signingOut}>
          <IconLogout size={18} stroke={1.75} aria-hidden />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </nav>
  );
}
