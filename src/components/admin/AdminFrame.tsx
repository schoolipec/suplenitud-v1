import {ReactNode} from "react";
import {cookies, headers} from "next/headers";
import {AdminSidebar} from "@/components/admin/AdminSidebar";
import {AdminHeader} from "@/components/admin/AdminHeader";
import {AdminShellProvider} from "@/components/admin/AdminShellProvider";
import {auth} from "@/lib/auth";
import {canViewPrayerRequests} from "@/lib/access";
import {ADMIN_LANGUAGE_COOKIE, resolveAdminLocale} from "@/i18n/admin-shell";
import type {ApplicationRole} from "@/generated/prisma/client";

export async function AdminFrame({roles, children}: {roles: string[]; children: ReactNode}) {
  const cookieStore = await cookies();
  const locale = resolveAdminLocale(cookieStore.get(ADMIN_LANGUAGE_COOKIE)?.value);
  const session = await auth.api.getSession({headers: await headers()});
  const userName = session?.user?.name?.trim() || session?.user?.email || null;
  const canViewNotifications = canViewPrayerRequests(roles as ApplicationRole[]);
  const environment = process.env.ADMIN_ENVIRONMENT === "demo" ? "Demo" : null;

  return (
    <AdminShellProvider initialLocale={locale}>
      <main className="admin-panel" lang={locale}>
        <AdminSidebar roles={roles} />
        <section className="admin-workspace">
          <AdminHeader roles={roles} userName={userName} canViewNotifications={canViewNotifications} environment={environment} />
          <div className="admin-workspace-body">{children}</div>
        </section>
      </main>
    </AdminShellProvider>
  );
}
