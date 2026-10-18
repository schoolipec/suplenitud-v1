"use client";

import {useEffect, useRef, useState} from "react";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {IconBell, IconX} from "@tabler/icons-react";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import type {AdminNotification} from "@/components/admin/NotificationsList";

type NotificationsResponse = {notifications?: AdminNotification[]; unreadCount?: number};

export function AdminNotificationsPopover() {
  const {locale, t} = useAdminShell();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/notifications?unreadOnly=true&take=1", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() as Promise<NotificationsResponse> : null))
      .then((data) => {
        if (!cancelled && data && typeof data.unreadCount === "number") setUnread(data.unreadCount);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/admin/notifications?unreadOnly=true&take=5", {cache: "no-store"});
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as NotificationsResponse;
      setItems(data.notifications ?? []);
      setUnread(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      setItems([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null) void load();
  }

  return (
    <div className="admin-popover-root" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="admin-icon-button admin-bell"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t.notifications.bell}
        onClick={toggle}
      >
        <IconBell size={19} aria-hidden />
        {unread > 0 ? <span className="admin-bell-badge" aria-hidden>{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="admin-popover" role="dialog" aria-label={t.notifications.title}>
          <div className="admin-popover-head">
            <strong>{t.notifications.title}</strong>
            <button type="button" className="admin-popover-close" aria-label={t.userMenu.close} onClick={() => setOpen(false)}>
              <IconX size={16} aria-hidden />
            </button>
          </div>
          {loading ? <p className="admin-popover-empty">{t.notifications.loading}</p> : null}
          {error ? <p className="admin-popover-empty" role="status">{t.notifications.error}</p> : null}
          {!loading && !error && items && items.length > 0 ? (
            <ul className="admin-popover-list">
              {items.map((notification) => (
                <li key={notification.id}>
                  <Link href="/admin/notifications" onClick={() => setOpen(false)}>
                    <strong>{t.notificationTypes[notification.type] ?? notification.type}</strong>
                    <span>{notification.title}</span>
                    <small>{new Date(notification.createdAt).toLocaleString(locale)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && !error && (!items || items.length === 0) ? <p className="admin-popover-empty">{t.notifications.empty}</p> : null}
          <Link className="admin-popover-all" href="/admin/notifications" onClick={() => setOpen(false)}>
            {t.notifications.viewAll}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
