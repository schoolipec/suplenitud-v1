"use client";
import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {Button, PasswordInput, Stack, Alert} from "@mantine/core";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

export function ChangePasswordForm() {
  const {locale} = useAdminShell();
  const l =
    locale === "es"
      ? {
          error: "No se pudo cambiar la contraseña. Verifica la contraseña actual e inténtalo de nuevo.",
          temporary: "Contraseña temporal",
          next: "Contraseña nueva",
          save: "Guardar nueva contraseña",
        }
      : {
          error: "The password could not be changed. Verify the current password and try again.",
          temporary: "Temporary password",
          next: "New password",
          save: "Save new password",
        };

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setMessage(l.error);
      return;
    }
    router.push("/admin");
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md" style={{maxWidth: "28rem"}}>
        <PasswordInput
          id="current-password"
          name="currentPassword"
          label={l.temporary}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          disabled={loading}
        />
        <PasswordInput
          id="new-password"
          name="newPassword"
          label={l.next}
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={16}
          required
          disabled={loading}
        />
        {message && <Alert color="red" role="alert">{message}</Alert>}
        <Button type="submit" disabled={loading} fullWidth>
          {l.save}
        </Button>
      </Stack>
    </form>
  );
}
