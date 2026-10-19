"use client";

import {useState} from "react";
import {Button, Group, Stack, Alert, Badge} from "@mantine/core";
import {IconBell, IconCheck, IconChecks, IconRefresh} from "@tabler/icons-react";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  read: boolean;
  createdAt: string;
  request: {id: string; name: string; status: string; requestType: string} | null;
};

const TYPE_LABELS: Record<string, string> = {
  NEW_PRAYER_REQUEST: "New prayer request",
  NEW_CONTACT_REQUEST: "New contact request",
  PENDING_ASSIGNMENT: "Pending assignment",
  ASSIGNMENT_MADE: "Assignment made",
};

export function NotificationsList({initialNotifications, initialUnread}: {initialNotifications: AdminNotification[]; initialUnread: number}) {
  const {locale, t} = useAdminShell();
  const l =
    locale === "es"
      ? {
          load: "No se pudieron cargar las notificaciones.",
          update: "No se pudo actualizar la notificación.",
          all: "Todas las notificaciones se marcaron como leídas.",
          title: "Alertas internas",
          unread: "sin leer",
          intro: "Alertas exclusivas del panel. No se envían mensajes externos.",
          refreshing: "Actualizando…",
          refresh: "Actualizar",
          allRead: "Marcar todo como leído",
          markRead: "Marcar como leído",
          markUnread: "Marcar como no leído",
          empty: "Aún no hay notificaciones.",
        }
      : {
          load: "Notifications could not be loaded.",
          update: "The notification could not be updated.",
          all: "All notifications marked as read.",
          title: "Internal alerts",
          unread: "unread",
          intro: "Panel-only alerts. No external messages are sent.",
          refreshing: "Refreshing…",
          refresh: "Refresh",
          allRead: "Mark all read",
          markRead: "Mark read",
          markUnread: "Mark unread",
          empty: "No notifications yet.",
        };

  const [notifications, setNotifications] = useState<AdminNotification[]>(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const response = await fetch("/api/admin/notifications?take=100", {cache: "no-store"});
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage(l.load);
      return;
    }
    setNotifications(data.notifications);
    setUnread(data.unreadCount);
  }

  async function markRead(id: string, read: boolean) {
    const response = await fetch(`/api/admin/notifications/${id}`, {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({read}),
    });
    if (!response.ok) {
      setMessage(l.update);
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? {...n, read} : n)));
    setUnread((prev) => prev + (read ? -1 : 1));
  }

  async function markAllRead() {
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({action: "read-all"}),
    });
    if (!response.ok) {
      setMessage(l.update);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({...n, read: true})));
    setUnread(0);
    setMessage(l.all);
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconBell size={19} aria-hidden />
          <div>
            <Group gap="sm">
              <h2 style={{margin: 0}}>{l.title}</h2>
              {unread > 0 && <Badge>{unread} {l.unread}</Badge>}
            </Group>
            <p style={{margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem"}}>{l.intro}</p>
          </div>
        </Group>
        <Group gap="xs">
          <Button
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={loading}
            leftSection={<IconRefresh size={16} />}
          >
            {loading ? l.refreshing : l.refresh}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={loading || unread === 0}
            leftSection={<IconChecks size={16} />}
          >
            {l.allRead}
          </Button>
        </Group>
      </Group>

      {message && <Alert role="status">{message}</Alert>}

      {notifications.length === 0 ? (
        <Alert color="gray" title={l.empty} />
      ) : (
        <Stack gap="xs">
          {notifications.map((notification) => (
            <Group
              key={notification.id}
              gap="sm"
              p="xs"
              style={{
                border: `1px solid var(--line)`,
                borderRadius: "var(--mantine-radius-sm, 4px)",
                backgroundColor: notification.read ? "transparent" : "var(--mist)",
              }}
            >
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontWeight: 600}}>
                  {t.notificationTypes[notification.type] ?? TYPE_LABELS[notification.type] ?? notification.type}
                </div>
                <div style={{fontSize: "0.9rem"}}>{notification.title}</div>
                <div style={{fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.25rem"}}>
                  {new Date(notification.createdAt).toLocaleString(locale === "es" ? "es-ES" : "en-US")}
                  {notification.request ? ` · ${notification.request.name} (${notification.request.status})` : ""}
                </div>
              </div>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => markRead(notification.id, !notification.read)}
                leftSection={<IconCheck size={14} />}
              >
                {notification.read ? l.markUnread : l.markRead}
              </Button>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
