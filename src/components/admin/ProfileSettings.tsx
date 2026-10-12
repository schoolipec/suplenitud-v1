"use client";

import {FormEvent, useState} from "react";

type Profile = {name: string; email: string; phone: string | null; whatsapp: string | null; telegramChatId: string | null};

export function ProfileSettings({profile}: {profile: Profile}) {
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/profile", {method: "PATCH", headers: {"content-type": "application/json"}, body: JSON.stringify({name: form.get("name"), phone: form.get("phone"), whatsapp: form.get("whatsapp"), telegramChatId: form.get("telegramChatId")})});
    setMessage(response.ok ? "Profile saved." : "The profile could not be saved. Try again.");
  }
  return <form onSubmit={onSubmit} className="admin-auth-form"><label htmlFor="profile-name">Name</label><input id="profile-name" name="name" defaultValue={profile.name} required/><label htmlFor="profile-email">Email</label><input id="profile-email" value={profile.email} readOnly aria-readonly="true"/><p className="admin-field-note">Email changes require a future verified-email workflow.</p><label htmlFor="profile-phone">Phone</label><input id="profile-phone" name="phone" type="tel" defaultValue={profile.phone ?? ""}/><label htmlFor="profile-whatsapp">WhatsApp</label><input id="profile-whatsapp" name="whatsapp" type="tel" defaultValue={profile.whatsapp ?? ""}/><label htmlFor="profile-telegram">Authorized Telegram ID</label><input id="profile-telegram" name="telegramChatId" inputMode="numeric" defaultValue={profile.telegramChatId ?? ""}/><p className="admin-field-note">A Telegram ID is stored here only; notifications are not activated until the n8n phase is approved and configured.</p><button type="submit">Save profile</button>{message ? <p role="status">{message}</p> : null}</form>;
}
