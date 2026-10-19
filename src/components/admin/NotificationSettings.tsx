"use client";

import {useState} from "react";
import {Checkbox, Stack, Alert, Group} from "@mantine/core";
import {IconBell, IconCheck} from "@tabler/icons-react";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

type NotificationPreferences = {
  newPrayerRequest: boolean;
  newContactRequest: boolean;
  pendingAssignment: boolean;
  assignmentMade: boolean;
};

export function NotificationSettings({initialPreferences}: {initialPreferences: NotificationPreferences}) {
  const {locale, t} = useAdminShell();
  const l =
    locale === "es"
      ? {
          saved: "Preferencia guardada.",
          failed: "No se pudo guardar la preferencia.",
          title: "Preferencias de notificaciones",
          intro: "Controla las alertas internas del panel. No activan canales externos.",
          note: "Las preferencias solo controlan notificaciones internas. Telegram, correo y WhatsApp no se activan aquí.",
        }
      : {
          saved: "Preference saved.",
          failed: "Could not save preference.",
          title: "Notification preferences",
          intro: "Control internal panel alerts. These do not activate external channels.",
          note: "Preferences only control internal panel notifications. Telegram, email, and WhatsApp are not activated.",
        };

  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(key: keyof NotificationPreferences) {
    setMessage(null);
    setSaving(true);
    const next = {...preferences, [key]: !preferences[key]};
    setPreferences(next);

    const response = await fetch("/api/admin/notification-preferences", {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({[key]: next[key]}),
    });

    setSaving(false);
    if (response.ok) {
      setMessage(l.saved);
    } else {
      setMessage(l.failed);
      setPreferences(preferences);
    }
  }

  return (
    <Stack gap="md">
      <Group gap="sm">
        <IconBell size={18} aria-hidden />
        <div>
          <h3 style={{margin: "0 0 0.5rem"}}>{l.title}</h3>
          <p style={{margin: 0, color: "var(--muted)"}}>{l.intro}</p>
        </div>
      </Group>

      {message && (
        <Alert
          color={message === l.saved ? "green" : "red"}
          role="status"
        >
          {message}
        </Alert>
      )}

      <Stack gap="xs">
        <Checkbox
          checked={preferences.newPrayerRequest}
          onChange={() => toggle("newPrayerRequest")}
          disabled={saving}
          label={t.notificationTypes.NEW_PRAYER_REQUEST}
        />
        <Checkbox
          checked={preferences.newContactRequest}
          onChange={() => toggle("newContactRequest")}
          disabled={saving}
          label={t.notificationTypes.NEW_CONTACT_REQUEST}
        />
        <Checkbox
          checked={preferences.pendingAssignment}
          onChange={() => toggle("pendingAssignment")}
          disabled={saving}
          label={t.notificationTypes.PENDING_ASSIGNMENT}
        />
        <Checkbox
          checked={preferences.assignmentMade}
          onChange={() => toggle("assignmentMade")}
          disabled={saving}
          label={t.notificationTypes.ASSIGNMENT_MADE}
        />
      </Stack>

      <Group gap={8} style={{color: "var(--muted)", fontSize: "0.9rem"}}>
        <IconCheck size={15} aria-hidden />
        <span>{l.note}</span>
      </Group>
    </Stack>
  );
}
