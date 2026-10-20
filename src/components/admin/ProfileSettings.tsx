"use client";

import {FormEvent, useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {TextInput, Button, Checkbox, Stack, Group, Dialog, Alert, Badge, Card, Avatar} from "@mantine/core";
import {IconBell, IconLock, IconMail, IconPencil, IconPhone, IconSend, IconShieldCheck} from "@tabler/icons-react";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import {authClient} from "@/lib/auth-client";

type Profile = {name: string; email: string; phone: string | null; whatsapp: string | null; telegramChatId: string | null; twoFactorEnabled: boolean; roles: string[]; prayerTelegramAlertsEnabled: boolean; prayerEmailCopiesEnabled: boolean};
type Editing = "identity" | "email" | "contact" | "channels" | null;

const text = {
  en: {
    saved: "Saved.",
    failed: "Your changes could not be saved. Try again.",
    name: "Name",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving…",
    contact: "Contact details",
    contactHelp: "Phone and WhatsApp used by the church office.",
    phone: "Phone",
    channels: "Notification channels",
    channelsHelp: "Set the Telegram ID that will receive your enabled alerts.",
    telegram: "Telegram ID",
    alerts: "Prayer request alerts",
    alertsHelp: "Choose how you receive new prayer requests.",
    telegramAlert: "Receive prayer requests via Telegram",
    telegramAlertHelp: "Requires the Telegram ID above.",
    emailAlert: "Receive email copies of prayer requests",
    emailAlertHelp: "Sends a copy to your access email.",
    security: "Security",
    securityHelp: "Set up or review two-factor authentication for this account.",
    openSecurity: "Open security settings",
    accessEmail: "Access email",
    accessEmailHelp: "This is the email you use to sign in.",
    changeEmail: "Change access email",
    newEmail: "New email",
    password: "Current password",
    continue: "Continue",
    warningTitle: "Confirm email change",
    warning: "Changing your access email will close all of your active sessions. You will need to sign in again with the new email and your current password.",
    confirm: "Change email and sign out",
    successTitle: "Email changed",
    success: "Your access email was updated. For your security, this session will close in {seconds} seconds.",
    invalid: "Check the new email and your current password.",
    duplicate: "That email is already in use.",
    twoFactorOn: "2FA active",
    twoFactorOff: "2FA not configured",
    edit: "Edit",
    close: "Close"
  },
  es: {
    saved: "Cambios guardados.",
    failed: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
    name: "Nombre",
    save: "Guardar",
    cancel: "Cancelar",
    saving: "Guardando…",
    contact: "Datos de contacto",
    contactHelp: "Teléfono y WhatsApp utilizados por la oficina de la iglesia.",
    phone: "Teléfono",
    channels: "Canales de notificación",
    channelsHelp: "Configura el ID de Telegram que recibirá tus alertas activadas.",
    telegram: "ID de Telegram",
    alerts: "Alertas de peticiones de oración",
    alertsHelp: "Elige cómo recibir nuevas peticiones de oración.",
    telegramAlert: "Recibir peticiones de oración por Telegram",
    telegramAlertHelp: "Requiere el ID de Telegram indicado arriba.",
    emailAlert: "Recibir copias por correo de peticiones de oración",
    emailAlertHelp: "Envía una copia a tu correo de acceso.",
    security: "Seguridad",
    securityHelp: "Configura o revisa la autenticación de dos factores de esta cuenta.",
    openSecurity: "Abrir configuración de seguridad",
    accessEmail: "Correo de acceso",
    accessEmailHelp: "Este es el correo que usas para iniciar sesión.",
    changeEmail: "Cambiar correo de acceso",
    newEmail: "Correo nuevo",
    password: "Contraseña actual",
    continue: "Continuar",
    warningTitle: "Confirmar cambio de correo",
    warning: "Cambiar tu correo de acceso cerrará todas tus sesiones activas. Deberás iniciar sesión de nuevo con el correo nuevo y tu contraseña actual.",
    confirm: "Cambiar correo y cerrar sesión",
    successTitle: "Correo actualizado",
    success: "Tu correo de acceso fue actualizado. Por seguridad, esta sesión se cerrará en {seconds} segundos.",
    invalid: "Revisa el correo nuevo y tu contraseña actual.",
    duplicate: "Ese correo ya está en uso.",
    twoFactorOn: "2FA activa",
    twoFactorOff: "2FA no configurada",
    edit: "Editar",
    close: "Cerrar"
  }
} as const;

async function saveProfile(payload: Record<string, unknown>) {
  const r = await fetch("/api/admin/profile", {
    method: "PATCH",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(payload)
  });
  return r.ok;
}

function ProfileSection({title, help, icon, editing, kind, editLabel, onEdit, children}: {
  title: string;
  help: string;
  icon: React.ReactNode;
  editing: Editing;
  kind: Editing;
  editLabel: string;
  onEdit: (kind: Editing) => void;
  children: React.ReactNode;
}) {
  return (
    <Card p="md" radius="md" style={{border: "1px solid var(--line)"}}>
      <Group justify="space-between" mb="md">
        <div>
          <Group gap="xs" mb="xs">
            {icon}
            <h3 style={{margin: 0}}>{title}</h3>
          </Group>
          <p style={{margin: 0, color: "var(--muted)", fontSize: "0.9rem"}}>{help}</p>
        </div>
        {editing !== kind && (
          <Button variant="subtle" size="xs" leftSection={<IconPencil size={14} />} onClick={() => onEdit(kind)}>
            {editLabel}
          </Button>
        )}
      </Group>
      {children}
    </Card>
  );
}

export function ProfileSettings({profile}: {profile: Profile}) {
  const router = useRouter();
  const {locale, t} = useAdminShell();
  const l = text[locale];

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");
  const [telegram, setTelegram] = useState(profile.telegramChatId ?? "");
  const [telegramEnabled, setTelegramEnabled] = useState(profile.prayerTelegramAlertsEnabled);
  const [emailEnabled, setEmailEnabled] = useState(profile.prayerEmailCopiesEnabled);
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextEmail, setNextEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [successEmail, setSuccessEmail] = useState(false);
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!successEmail) return;
    if (seconds <= 0) {
      void authClient.signOut().finally(() => router.push("/admin/sign-in?emailChanged=1"));
      return;
    }
    const id = window.setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [successEmail, seconds, router]);

  const closeEmail = () => {
    setEditing(null);
    setConfirmEmail(false);
    setNextEmail("");
    setCurrentPassword("");
  };

  async function submit(e: FormEvent<HTMLFormElement>, section: Editing) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const f = new FormData(e.currentTarget);
    const payload =
      section === "identity"
        ? {name: String(f.get("name") ?? "").trim()}
        : section === "contact"
          ? {name, phone: String(f.get("phone") ?? "").trim(), whatsapp: String(f.get("whatsapp") ?? "").trim()}
          : {name, telegramChatId: String(f.get("telegramChatId") ?? "").trim()};
    const ok = await saveProfile(payload);
    setSaving(false);
    if (!ok) return setMessage(l.failed);
    if (section === "identity") setName(payload.name);
    if (section === "contact") {
      setPhone(payload.phone ?? "");
      setWhatsapp(payload.whatsapp ?? "");
    }
    if (section === "channels") setTelegram(payload.telegramChatId ?? "");
    setEditing(null);
    setMessage(l.saved);
  }

  async function toggle(kind: "telegram" | "email") {
    setSaving(true);
    setMessage(null);
    const next = kind === "telegram" ? !telegramEnabled : !emailEnabled;
    const ok = await saveProfile({
      name,
      prayerTelegramAlertsEnabled: kind === "telegram" ? next : telegramEnabled,
      prayerEmailCopiesEnabled: kind === "email" ? next : emailEnabled
    });
    setSaving(false);
    if (!ok) return setMessage(l.failed);
    if (kind === "telegram") setTelegramEnabled(next);
    else setEmailEnabled(next);
    setMessage(l.saved);
  }

  async function changeEmail() {
    setSaving(true);
    setMessage(null);
    const r = await fetch("/api/admin/profile/email", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({email: nextEmail, currentPassword})
    });
    setSaving(false);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setConfirmEmail(false);
      setMessage(data.error === "email_in_use" ? l.duplicate : l.invalid);
      return;
    }
    setCurrentPassword("");
    setConfirmEmail(false);
    setSuccessEmail(true);
  }

  return (
    <Stack gap="lg">
      {message && <Alert role="status">{message}</Alert>}

      <Card p="lg" radius="md" style={{border: "1px solid var(--line)", backgroundColor: "var(--mist)"}}>
        <Group gap="md" mb="md">
          <Avatar name={name} size={64} radius="xl" />
          <div style={{flex: 1}}>
            <h2 style={{margin: "0 0 0.5rem"}}>{name}</h2>
            <Group gap="xs" mb="xs">
              <IconMail size={16} />
              <span style={{fontSize: "0.9rem"}}>{profile.email}</span>
            </Group>
            <Group gap="xs">
              {profile.roles.map((role) => (
                <Badge key={role}>{t.roles[role] ?? role}</Badge>
              ))}
              <Badge color={profile.twoFactorEnabled ? "green" : "gray"}>
                {profile.twoFactorEnabled ? l.twoFactorOn : l.twoFactorOff}
              </Badge>
            </Group>
          </div>
          {editing !== "identity" && (
            <Button variant="subtle" size="xs" leftSection={<IconPencil size={14} />} onClick={() => setEditing("identity")}>
              {l.edit}
            </Button>
          )}
        </Group>

        {editing === "identity" && (
          <form onSubmit={(e) => submit(e, "identity")}>
            <Stack gap="md">
              <TextInput label={l.name} name="name" defaultValue={name} required minLength={2} />
              <Group justify="flex-end" gap="sm">
                <Button variant="outline" onClick={() => setEditing(null)}>{l.cancel}</Button>
                <Button type="submit" disabled={saving}>{saving ? l.saving : l.save}</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Card>

      <ProfileSection title={l.accessEmail} help={l.accessEmailHelp} icon={<IconMail size={18} />} kind="email" editing={editing} editLabel={l.edit} onEdit={setEditing}>
        {editing === "email" ? (
          <form onSubmit={(e) => {e.preventDefault(); setConfirmEmail(true);}}>
            <Stack gap="md">
              <TextInput label={l.newEmail} type="email" value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} required />
              <TextInput label={l.password} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
              <Group justify="flex-end" gap="sm">
                <Button variant="outline" onClick={closeEmail}>{l.cancel}</Button>
                <Button type="submit" disabled={saving}>{l.continue}</Button>
              </Group>
            </Stack>
          </form>
        ) : (
          <p>{profile.email}</p>
        )}
      </ProfileSection>

      <ProfileSection title={l.contact} help={l.contactHelp} icon={<IconPhone size={18} />} kind="contact" editing={editing} editLabel={l.edit} onEdit={setEditing}>
        {editing === "contact" ? (
          <form onSubmit={(e) => submit(e, "contact")}>
            <Stack gap="md">
              <TextInput label={l.phone} name="phone" type="tel" defaultValue={phone} />
              <TextInput label="WhatsApp" name="whatsapp" type="tel" defaultValue={whatsapp} />
              <Group justify="flex-end" gap="sm">
                <Button variant="outline" onClick={() => setEditing(null)}>{l.cancel}</Button>
                <Button type="submit" disabled={saving}>{saving ? l.saving : l.save}</Button>
              </Group>
            </Stack>
          </form>
        ) : (
          <Stack gap="xs">
            <div style={{display: "grid", gridTemplateColumns: "100px 1fr", gap: "1rem"}}>
              <strong>{l.phone}</strong>
              <span>{phone || "—"}</span>
              <strong>WhatsApp</strong>
              <span>{whatsapp || "—"}</span>
            </div>
          </Stack>
        )}
      </ProfileSection>

      <ProfileSection title={l.channels} help={l.channelsHelp} icon={<IconSend size={18} />} kind="channels" editing={editing} editLabel={l.edit} onEdit={setEditing}>
        {editing === "channels" ? (
          <form onSubmit={(e) => submit(e, "channels")}>
            <Stack gap="md">
              <TextInput label={l.telegram} name="telegramChatId" inputMode="numeric" defaultValue={telegram} />
              <Group justify="flex-end" gap="sm">
                <Button variant="outline" onClick={() => setEditing(null)}>{l.cancel}</Button>
                <Button type="submit" disabled={saving}>{saving ? l.saving : l.save}</Button>
              </Group>
            </Stack>
          </form>
        ) : (
          <div style={{display: "grid", gridTemplateColumns: "100px 1fr", gap: "1rem"}}>
            <strong>{l.telegram}</strong>
            <span>{telegram || "—"}</span>
          </div>
        )}
      </ProfileSection>

      <Card p="md" radius="md" style={{border: "1px solid var(--line)"}}>
        <Group gap="xs" mb="md">
          <IconBell size={18} />
          <div style={{flex: 1}}>
            <h3 style={{margin: "0 0 0.25rem"}}>{l.alerts}</h3>
            <p style={{margin: 0, color: "var(--muted)", fontSize: "0.9rem"}}>{l.alertsHelp}</p>
          </div>
        </Group>
        <Stack gap="md">
          <Checkbox checked={telegramEnabled} disabled={saving} onChange={() => toggle("telegram")} label={<div><strong>{l.telegramAlert}</strong><p style={{margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--muted)"}}>{l.telegramAlertHelp}</p></div>} />
          <Checkbox checked={emailEnabled} disabled={saving} onChange={() => toggle("email")} label={<div><strong>{l.emailAlert}</strong><p style={{margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--muted)"}}>{l.emailAlertHelp}</p></div>} />
        </Stack>
      </Card>

      <Card p="md" radius="md" style={{border: "1px solid var(--line)"}}>
        <Group gap="xs" mb="md">
          <IconShieldCheck size={18} />
          <div style={{flex: 1}}>
            <h3 style={{margin: "0 0 0.25rem"}}>{l.security}</h3>
            <p style={{margin: 0, color: "var(--muted)", fontSize: "0.9rem"}}>{l.securityHelp}</p>
          </div>
        </Group>
        <Link href="/admin/security" style={{textDecoration: "none"}}>
          <Button variant="outline" size="sm" leftSection={<IconLock size={14} />}>
            {l.openSecurity}
          </Button>
        </Link>
      </Card>

      <Dialog opened={confirmEmail} onClose={() => setConfirmEmail(false)} title={l.warningTitle}>
        <Stack gap="md">
          <p>{l.warning}</p>
          <Group justify="flex-end" gap="sm">
            <Button variant="outline" onClick={() => setConfirmEmail(false)}>{l.cancel}</Button>
            <Button disabled={saving} onClick={changeEmail}>{saving ? l.saving : l.confirm}</Button>
          </Group>
        </Stack>
      </Dialog>

      <Dialog opened={successEmail} onClose={() => undefined} title={l.successTitle}>
        <Stack gap="md">
          <p>{l.success.replace("{seconds}", String(seconds))}</p>
          <p style={{textAlign: "center", fontSize: "1.25rem", fontWeight: "bold"}} aria-live="polite">{seconds}</p>
        </Stack>
      </Dialog>
    </Stack>
  );
}
