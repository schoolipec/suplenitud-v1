"use client";

import {useState} from "react";
import {IconBell, IconCheck} from "@tabler/icons-react";

type NotificationPreferences = {
  newPrayerRequest: boolean;
  newContactRequest: boolean;
  pendingAssignment: boolean;
  assignmentMade: boolean;
};

export function NotificationSettings({initialPreferences}: {initialPreferences: NotificationPreferences}) {
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
      setMessage("Preference saved.");
    } else {
      setMessage("Could not save preference.");
      setPreferences(preferences);
    }
  }

  return (
    <section className="admin-profile-section">
      <div className="admin-profile-section-heading">
        <div>
          <h3><IconBell size={18} aria-hidden /> Notification preferences</h3>
          <p>Control internal panel alerts. These do not activate external channels.</p>
        </div>
      </div>

      {message ? <p className="admin-status-message" role="status">{message}</p> : null}

      <div className="admin-notification-preferences">
        <label className="admin-checkbox-row">
          <input
            type="checkbox"
            checked={preferences.newPrayerRequest}
            onChange={() => toggle("newPrayerRequest")}
            disabled={saving}
          />
          <span>New prayer request</span>
        </label>
        <label className="admin-checkbox-row">
          <input
            type="checkbox"
            checked={preferences.newContactRequest}
            onChange={() => toggle("newContactRequest")}
            disabled={saving}
          />
          <span>New contact request</span>
        </label>
        <label className="admin-checkbox-row">
          <input
            type="checkbox"
            checked={preferences.pendingAssignment}
            onChange={() => toggle("pendingAssignment")}
            disabled={saving}
          />
          <span>Pending assignment</span>
        </label>
        <label className="admin-checkbox-row">
          <input
            type="checkbox"
            checked={preferences.assignmentMade}
            onChange={() => toggle("assignmentMade")}
            disabled={saving}
          />
          <span>Assignment made</span>
        </label>
      </div>

      <p className="admin-field-note">
        <IconCheck size={15} aria-hidden />
        Preferences only control internal panel notifications. Telegram, email, and WhatsApp are not activated.
      </p>
    </section>
  );
}
