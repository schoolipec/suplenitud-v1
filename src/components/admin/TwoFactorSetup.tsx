"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Button, PasswordInput, TextInput, Stack, Alert, Code, Title, List} from "@mantine/core";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

type Enrollment = {totpURI: string; backupCodes: string[]};

export function TwoFactorSetup({enabled}: {enabled: boolean}) {
  const {locale} = useAdminShell();
  const l =
    locale === "es"
      ? {
          passwordError: "No se pudo verificar tu contraseña. Inténtalo de nuevo.",
          codeError: "El código de verificación no es válido. Inténtalo de nuevo.",
          active: "La autenticación de dos factores está activa para esta cuenta.",
          app: "Usa tu aplicación de autenticación al iniciar sesión.",
          return: "Volver a administración",
          add: "Agrega esta URI manualmente a una aplicación de autenticación. No la compartas.",
          recovery: "Códigos de recuperación",
          store: "Guarda estos códigos en un lugar seguro. Cada código se usa una vez y no se mostrará nuevamente.",
          code: "Código de tu aplicación de autenticación",
          confirming: "Confirmando…",
          confirm: "Confirmar autenticación de dos factores",
          protect: "Protege esta cuenta administrativa con una aplicación de autenticación. Recibirás códigos de recuperación durante la configuración.",
          current: "Contraseña actual",
          preparing: "Preparando…",
          setup: "Configurar autenticación de dos factores",
        }
      : {
          passwordError: "Your password could not be verified. Try again.",
          codeError: "The verification code is not valid. Try again.",
          active: "Two-factor authentication is active for this account.",
          app: "Use your authenticator app when signing in.",
          return: "Return to administration",
          add: "Add this setup URI manually to an authenticator app. Do not share it.",
          recovery: "Recovery codes",
          store: "Store these codes somewhere safe. Each code can be used once and will not be shown again.",
          code: "Code from your authenticator app",
          confirming: "Confirming…",
          confirm: "Confirm two-factor authentication",
          protect: "Protect this administrator account with an authenticator app. You will receive recovery codes during setup.",
          current: "Current password",
          preparing: "Preparing…",
          setup: "Set up two-factor authentication",
        };

  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await authClient.twoFactor.enable({password, method: "totp", issuer: "Iglesia Plenitud en Cristo"});
    setLoading(false);
    if (result.error || result.data?.method !== "totp") {
      setError(l.passwordError);
      return;
    }
    setEnrollment({totpURI: result.data.totpURI, backupCodes: result.data.backupCodes});
  }

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const result = await authClient.twoFactor.verifyTotp({code});
    setLoading(false);
    if (result.error) {
      setError(l.codeError);
      return;
    }
    router.refresh();
  }

  if (enabled) {
    return (
      <Stack gap="md">
        <p>{l.active}</p>
        <p>{l.app}</p>
        <Link href="/admin" style={{textDecoration: "none"}}>
          <Button variant="subtle">{l.return}</Button>
        </Link>
      </Stack>
    );
  }

  if (enrollment) {
    return (
      <Stack gap="md" style={{maxWidth: "28rem"}}>
        <p>{l.add}</p>
        <Code block>{enrollment.totpURI}</Code>
        <Title order={3}>{l.recovery}</Title>
        <p>{l.store}</p>
        <List>
          {enrollment.backupCodes.map((code) => (
            <List.Item key={code}>{code}</List.Item>
          ))}
        </List>
        <form onSubmit={confirmEnrollment}>
          <Stack gap="md">
            <TextInput
              id="two-factor-setup-code"
              name="code"
              label={l.code}
              placeholder="000000"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={loading}
            />
            {error && <Alert color="red" role="alert">{error}</Alert>}
            <Button type="submit" disabled={loading} fullWidth>
              {loading ? l.confirming : l.confirm}
            </Button>
          </Stack>
        </form>
      </Stack>
    );
  }

  return (
    <Stack gap="md" style={{maxWidth: "28rem"}}>
      <p>{l.protect}</p>
      <form onSubmit={startEnrollment}>
        <Stack gap="md">
          <PasswordInput
            id="two-factor-password"
            name="password"
            label={l.current}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={loading}
          />
          {error && <Alert color="red" role="alert">{error}</Alert>}
          <Button type="submit" disabled={loading} fullWidth>
            {loading ? l.preparing : l.setup}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
