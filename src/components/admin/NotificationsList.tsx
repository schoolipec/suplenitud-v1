"use client";

import {useState} from "react";
import {IconBell, IconCheck, IconChecks, IconRefresh} from "@tabler/icons-react";

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
      setMessage("Notifications could not be loaded.");
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
      setMessage("The notification could not be updated.");
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
      setMessage("Notifications could not be updated.");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({...n, read: true})));
    setUnread(0);
    setMessage("All notifications marked as read.");
  }

  return (
    <div className="admin-notifications">
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2><IconBell size={19} aria-hidden /> Internal alerts {unread > 0 ? <span className="admin-badge">{unread} unread</span> : null}</h2>
            <p>Panel-only alerts. No external messages are sent.</p>
          </div>
          <div className="admin-section-actions">
            <button type="button" className="admin-button-secondary" onClick={reload} disabled={loading}>
              <IconRefresh size={17} aria-hidden />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button type="button" className="admin-button-secondary" onClick={markAllRead} disabled={loading || unread === 0}>
              <IconChecks size={17} aria-hidden />
              Mark all read
            </button>
          </div>
        </div>

        {message ? <p className="admin-status-message" role="status">{message}</p> : null}

        <ul className="admin-audit-list">
          {notifications.map((notification) => (
            <li key={notification.id} className={notification.read ? "" : "is-unread"}>
              <strong>{TYPE_LABELS[notification.type] ?? notification.type}</strong>
              <span>{notification.title}</span>
              <span>
                {new Date(notification.createdAt).toLocaleString("en-US")}
                {notification.request ? ` · ${notification.request.name} (${notification.request.status})` : ""}
              </span>
              <button
                type="button"
                className="admin-button-secondary admin-button-small"
                onClick={() => markRead(notification.id, !notification.read)}
              >
                <IconCheck size={15} aria-hidden />
                {notification.read ? "Mark unread" : "Mark read"}
              </button>
            </li>
          ))}
          {notifications.length === 0 ? (
            <li><span className="admin-empty">No notifications yet.</span></li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
