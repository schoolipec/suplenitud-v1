"use client";

import Link from "next/link";
import {authClient} from "@/lib/auth-client";
import {IconUser} from "@tabler/icons-react";

/** Signed-in admin identity shown in the panel topbar (profile context). */
export function AdminUserChip() {
  const {data: session, isPending} = authClient.useSession();
  if (isPending || !session?.user) return null;
  return (
    <Link className="admin-user-chip" href="/admin/configs" aria-label="Open your settings">
      <span className="admin-user-chip-avatar" aria-hidden>
        {(session.user.name || session.user.email || "?").charAt(0).toUpperCase()}
      </span>
      <span className="admin-user-chip-text">
        <strong>{session.user.name || session.user.email}</strong>
        <span>{session.user.email}</span>
      </span>
      <IconUser size={16} aria-hidden />
    </Link>
  );
}
