"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useEffect, useRef, useState} from "react";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import {
  IconAddressBook,
  IconArticle,
  IconBell,
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
type GroupKey = "main" | "ministry" | "content" | "system";

export function AdminSidebar({roles}: {roles: string[]}) {
  const pathname = usePathname();
  const router = useRouter();
  const {t} = useAdminShell();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isSuperOrAdmin = isSuperAdmin || roles.includes("ADMIN");

  const rawGroups: {key: GroupKey; items: Item[]}[] = [
    {key: "main", items: [{href: "/admin", label: t.navigation.overview, icon: IconLayoutDashboard}]},
    {
      key: "ministry",
      items: [
        {href: "/admin/ministry-contacts", label: t.navigation.ministryContacts, icon: IconAddressBook, visible: isSuperOrAdmin},
        {href: "/admin/visits", label: t.navigation.visits, icon: IconChartBar, visible: isSuperOrAdmin},
        {href: "/admin/prayer-requests", label: t.navigation.prayerRequests, icon: IconPray, visible: isSuperOrAdmin},
        {href: "/admin/ushers", label: t.navigation.ushers, icon: IconUsersGroup, visible: isSuperOrAdmin},
      ],
    },
    {
      key: "content",
      items: [
        {href: "/admin/content", label: t.navigation.websiteContent, icon: IconArticle, visible: isSuperOrAdmin},
        {href: "/admin/donations", label: t.navigation.donations, icon: IconHeartHandshake, visible: isSuperAdmin || roles.includes("ADMIN") || roles.includes("TREASURER")},
      ],
    },
    {key: "system", items: [
      {href: "/admin/users", label: t.navigation.users, icon: IconUsers, visible: isSuperAdmin},
      {href: "/admin/notifications", label: t.navigation.notifications, icon: IconBell, visible: isSuperOrAdmin},
      {href: "/admin/configs", label: t.navigation.settings, icon: IconSettings},
    ]},
  ];

  const groups = rawGroups
    .map((group) => ({...group, items: group.items.filter((item) => item.visible !== false)}))
    .filter((group) => group.items.length > 0);

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
    setMenuOpen(false);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <nav className="admin-navigation" aria-label={t.navigation.aria}>
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
          <span className="admin-sr-only">{menuOpen ? t.mobile.closeMenu : t.mobile.openMenu}</span>
        </button>
        <p className="admin-mobile-brand">Iglesia Plenitud</p>
        <button type="button" className="admin-mobile-sign-out" onClick={signOut} disabled={signingOut}>
          <IconLogout size={20} aria-hidden />
          <span className="admin-sr-only">{signingOut ? t.userMenu.signingOut : t.userMenu.signOut}</span>
        </button>
      </div>
      {menuOpen ? <button type="button" className="admin-nav-overlay" aria-label={t.mobile.closeMenu} onClick={() => setMenuOpen(false)} /> : null}
      <div ref={panelRef} id="admin-nav-panel" className={menuOpen ? "admin-nav-panel is-open" : "admin-nav-panel"}>
        <p className="admin-navigation-title">Iglesia Plenitud</p>
        {groups.map((group) => (
          <div key={group.key} className="admin-navigation-group">
            <p className="admin-navigation-group-title">{t.navigation.groups[group.key]}</p>
            <div className="admin-navigation-links">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={isActive ? "is-active" : ""} aria-current={isActive ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                    <Icon size={19} stroke={1.75} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <button type="button" className="admin-navigation-signout" onClick={signOut} disabled={signingOut}>
          <IconLogout size={18} aria-hidden />
          <span>{signingOut ? t.userMenu.signingOut : t.userMenu.signOut}</span>
        </button>
      </div>
    </nav>
  );
}
