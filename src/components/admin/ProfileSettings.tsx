"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {IconCheck, IconLock, IconMail, IconPencil, IconPhone, IconSend, IconShieldCheck} from "@tabler/icons-react";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  telegramChatId: string | null;
  twoFactorEnabled: boolean;
  roles: string[];
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  TREASURER: "Treasurer",
  USHER: "Usher",
};

async function saveProfile(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/profile", {
    method: "PATCH",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(payload),
  });
  return response.ok;
}

export function ProfileSettings({profile}: {profile: Profile}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");
  const [telegramChatId, setTelegramChatId] = useState(profile.telegramChatId ?? "");
  const [editing, setEditing] = useState<"identity" | "contact" | "channels" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submitIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const nextName = String(form.get("name") ?? "").trim();
    const ok = await saveProfile({name: nextName});
    setSaving(false);
    if (!ok) {
      setMessage("Your name could not be saved. Try again.");
      return;
    }
    setName(nextName);
    setEditing(null);
    setMessage("Name saved.");
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const nextPhone = String(form.get("phone") ?? "").trim();
    const nextWhatsapp = String(form.get("whatsapp") ?? "").trim();
    const ok = await saveProfile({name, phone: nextPhone, whatsapp: nextWhatsapp});
    setSaving(false);
    if (!ok) {
      setMessage("Your contact details could not be saved. Try again.");
      return;
    }
    setPhone(nextPhone);
    setWhatsapp(nextWhatsapp);
    setEditing(null);
    setMessage("Contact details saved.");
  }

  async function submitChannels(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const nextTelegram = String(form.get("telegramChatId") ?? "").trim();
    const ok = await saveProfile({name, telegramChatId: nextTelegram});
    setSaving(false);
    if (!ok) {
      setMessage("Your authorized channel could not be saved. Try again.");
      return;
    }
    setTelegramChatId(nextTelegram);
    setEditing(null);
    setMessage("Authorized channel saved.");
  }

  return (
    <div className="admin-profile-card">
      {message ? <p className="admin-status-message" role="status">{message}</p> : null}

      <header className="admin-profile-identity">
        <div className="admin-profile-avatar" aria-hidden>{name.charAt(0).toUpperCase()}</div>
        <div className="admin-profile-identity-text">
          <h2>{name}</h2>
          <p className="admin-profile-email"><IconMail size={16} aria-hidden /> {profile.email}</p>
          <div className="admin-profile-badges">
            {profile.roles.map((role) => (
              <span key={role} className="admin-badge">{roleLabels[role] ?? role}</span>
            ))}
            <span className={profile.twoFactorEnabled ? "admin-badge admin-badge-success" : "admin-badge admin-badge-muted"}>
              {profile.twoFactorEnabled ? "2FA active" : "2FA not configured"}
            </span>
          </div>
        </div>
        {editing === "identity" ? null : (
          <button type="button" className="admin-icon-button" onClick={() => setEditing("identity")} aria-label="Edit your name">
            <IconPencil size={17} aria-hidden />
          </button>
        )}
      </header>

      {editing === "identity" ? (
        <form onSubmit={submitIdentity} className="admin-auth-form admin-profile-edit">
          <div>
            <label htmlFor="profile-name">Name</label>
            <input id="profile-name" name="name" defaultValue={name} required minLength={2} />
          </div>
          <div className="admin-form-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save name"}</button>
            <button type="button" className="admin-button-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : null}

      <section className="admin-profile-section">
        <div className="admin-profile-section-heading">
          <div>
            <h3><IconPhone size={18} aria-hidden /> Contact details</h3>
            <p>Phone and WhatsApp used by the church office.</p>
          </div>
          {editing === "contact" ? null : (
            <button type="button" className="admin-icon-button" onClick={() => setEditing("contact")} aria-label="Edit contact details">
              <IconPencil size={17} aria-hidden />
            </button>
          )}
        </div>
        {editing === "contact" ? (
          <form onSubmit={submitContact} className="admin-auth-form admin-form-grid">
            <div>
              <label htmlFor="profile-phone">Phone</label>
              <input id="profile-phone" name="phone" type="tel" defaultValue={phone} />
            </div>
            <div>
              <label htmlFor="profile-whatsapp">WhatsApp</label>
              <input id="profile-whatsapp" name="whatsapp" type="tel" defaultValue={whatsapp} />
            </div>
            <div className="admin-form-actions">
              <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save contact details"}</button>
              <button type="button" className="admin-button-ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <dl className="admin-profile-fields">
            <div><dt>Phone</dt><dd>{phone || "—"}</dd></div>
            <div><dt>WhatsApp</dt><dd>{whatsapp || "—"}</dd></div>
          </dl>
        )}
      </section>

      <section className="admin-profile-section">
        <div className="admin-profile-section-heading">
          <div>
            <h3><IconSend size={18} aria-hidden /> Authorized channels</h3>
            <p>Telegram is stored for a future authorized phase only.</p>
          </div>
          {editing === "channels" ? null : (
            <button type="button" className="admin-icon-button" onClick={() => setEditing("channels")} aria-label="Edit authorized channels">
              <IconPencil size={17} aria-hidden />
            </button>
          )}
        </div>
        {editing === "channels" ? (
          <form onSubmit={submitChannels} className="admin-auth-form admin-form-grid">
            <div>
              <label htmlFor="profile-telegram">Authorized Telegram ID</label>
              <input id="profile-telegram" name="telegramChatId" inputMode="numeric" defaultValue={telegramChatId} />
              <p className="admin-field-note">Notifications are not activated until the future communications phase is approved and configured.</p>
            </div>
            <div className="admin-form-actions">
              <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save channel"}</button>
              <button type="button" className="admin-button-ghost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <dl className="admin-profile-fields">
            <div><dt>Telegram ID</dt><dd>{telegramChatId || "—"}</dd></div>
          </dl>
        )}
      </section>

      <section className="admin-profile-section">
        <div className="admin-profile-section-heading">
          <div>
            <h3><IconShieldCheck size={18} aria-hidden /> Security</h3>
            <p>Set up or review two-factor authentication for this account.</p>
          </div>
        </div>
        <p className="admin-profile-security-link">
          <Link className="admin-action-link" href="/admin/security"><IconLock size={16} aria-hidden /> Open security settings</Link>
        </p>
        <p className="admin-profile-saved-note"><IconCheck size={15} aria-hidden /> Changes are saved only when you press the save button in each section.</p>
      </section>
    </div>
  );
}
