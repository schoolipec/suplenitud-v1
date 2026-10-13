import {ReactNode} from "react";
import {AdminNavigation} from "@/components/admin/AdminNavigation";

export function AdminFrame({roles, eyebrow = "Administration", title, children}: {roles: string[]; eyebrow?: string; title: string; children: ReactNode}) {
  return (
    <main className="admin-panel" lang="en">
      <AdminNavigation roles={roles} />
      <section className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-heading">
            <p className="admin-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        </header>
        <div className="admin-workspace-body">{children}</div>
      </section>
    </main>
  );
}
