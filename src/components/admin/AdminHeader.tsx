"use client";

import {usePathname} from "next/navigation";
import {AdminBreadcrumbs} from "@/components/admin/AdminBreadcrumbs";
import {AdminNotificationsPopover} from "@/components/admin/AdminNotificationsPopover";
import {AdminUserMenu} from "@/components/admin/AdminUserMenu";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import {adminPageTitle} from "@/lib/admin-navigation";

export function AdminHeader({roles, userName, canViewNotifications, environment}: {roles: string[]; userName: string | null; canViewNotifications: boolean; environment: string | null}) {
  const pathname = usePathname();
  const {t} = useAdminShell();
  const title = adminPageTitle(pathname, t, userName);
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-heading">
        <AdminBreadcrumbs />
        <h1>{title}</h1>
      </div>
      <div className="admin-topbar-actions">
        {environment ? <span className="admin-env-badge" title={environment}>{environment}</span> : null}
        {canViewNotifications ? <AdminNotificationsPopover /> : null}
        <AdminUserMenu roles={roles} canViewNotifications={canViewNotifications} />
      </div>
    </header>
  );
}
