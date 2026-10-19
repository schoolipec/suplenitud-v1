"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {Button, PasswordInput, TextInput, Stack, Alert} from "@mantine/core";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

export function SignInForm() {
  const {locale} = useAdminShell();
  const l =
    locale === "es"
      ? {
          email: "Correo",
          password: "Contraseña",
          invalid: "El correo o la contraseña no son válidos.",
          forgot: "¿Olvidaste tu contraseña?",
          signing: "Iniciando sesión…",
          signIn: "Iniciar sesión",
        }
      : {
          email: "Email",
          password: "Password",
          invalid: "The email or password is not valid.",
          forgot: "Forgot your password?",
          signing: "Signing in…",
          signIn: "Sign in",
        };

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      callbackURL: "/admin",
    });
    setLoading(false);
    if (result.error) setError(l.invalid);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md" style={{maxWidth: "28rem"}}>
        <TextInput
          id="admin-email"
          name="email"
          type="email"
          label={l.email}
          placeholder="user@example.com"
          autoComplete="email"
          required
          disabled={loading}
        />
        <PasswordInput
          id="admin-password"
          name="password"
          label={l.password}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          disabled={loading}
        />
        <Link href="/admin/recover-password" style={{textDecoration: "none"}}>
          <Button variant="subtle" size="xs" component="span">
            {l.forgot}
          </Button>
        </Link>
        {error && <Alert color="red" role="alert">{error}</Alert>}
        <Button type="submit" disabled={loading} fullWidth>
          {loading ? l.signing : l.signIn}
        </Button>
      </Stack>
    </form>
  );
}
