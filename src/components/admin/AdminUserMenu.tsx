"use client";

import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {IconBell, IconChevronDown, IconLock, IconLogout, IconUser, IconUserCircle} from "@tabler/icons-react";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import {adminRoleLabel} from "@/i18n/admin-shell";

export function AdminUserMenu({roles, canViewNotifications}: {roles: string[]; canViewNotifications: boolean}) {
  const router = useRouter();
  const {locale, t, switching, setLocale} = useAdminShell();
  const session = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    setOpen(false);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  if (session.isPending || !session.data?.user) return null;
  const name = session.data.user.name || session.data.user.email || "";
  const email = session.data.user.email || "";
  const initials = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="admin-user-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="admin-user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.userMenu.aria}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="admin-user-chip-avatar" aria-hidden>{initials}</span>
        <span className="admin-user-chip-text">
          <strong>{name}</strong>
          <span>{email}</span>
        </span>
        <IconChevronDown size={16} aria-hidden />
      </button>
      {open ? (
        <div className="admin-menu-panel" role="menu" aria-label={t.userMenu.aria}>
          <div className="admin-menu-identity">
            <span className="admin-user-chip-avatar" aria-hidden>{initials}</span>
            <div>
              <strong>{name}</strong>
              <span>{email}</span>
              {roles.length > 0 ? (
                <span className="admin-menu-roles">
                  {roles.map((role) => (
                    <span key={role} className="admin-badge admin-badge-muted">{adminRoleLabel(t, role)}</span>
                  ))}
                </span>
              ) : null}
            </div>
          </div>
          <div className="admin-menu-links">
            <Link role="menuitem" href="/admin/configs" onClick={() => setOpen(false)}>
              <IconUser size={17} aria-hidden />
              <span>{t.userMenu.profile}</span>
            </Link>
            <Link role="menuitem" href="/admin/security" onClick={() => setOpen(false)}>
              <IconLock size={17} aria-hidden />
              <span>{t.userMenu.security}</span>
            </Link>
            {canViewNotifications ? (
              <Link role="menuitem" href="/admin/notifications" onClick={() => setOpen(false)}>
                <IconBell size={17} aria-hidden />
                <span>{t.userMenu.alerts}</span>
              </Link>
            ) : null}
          </div>
          <div className="admin-menu-language" role="group" aria-label={t.userMenu.language}>
            <span className="admin-menu-language-label"><IconUserCircle size={16} aria-hidden />{t.userMenu.language}</span>
            <div className="admin-lang-switch">
              {(["en", "es"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={locale === code ? "is-active" : ""}
                  aria-pressed={locale === code}
                  disabled={switching}
                  onClick={() => setLocale(code)}
                >
                  {t.languageNames[code]}
                </button>
              ))}
            </div>
          </div>
          <button type="button" role="menuitem" className="admin-menu-signout" onClick={signOut} disabled={signingOut}>
            <IconLogout size={17} aria-hidden />
            <span>{signingOut ? t.userMenu.signingOut : t.userMenu.signOut}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
