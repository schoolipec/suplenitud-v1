"use client";

import {AdminBreadcrumbs} from "@/components/admin/AdminBreadcrumbs";
import {AdminNotificationsPopover} from "@/components/admin/AdminNotificationsPopover";
import {AdminUserMenu} from "@/components/admin/AdminUserMenu";

export function AdminHeader({title, roles, canViewNotifications, environment}: {title: string; roles: string[]; canViewNotifications: boolean; environment: string | null}) {
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
