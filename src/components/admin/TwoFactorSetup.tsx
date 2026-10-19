"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

type Enrollment = {totpURI: string; backupCodes: string[]};

export function TwoFactorSetup({enabled}: {enabled: boolean}) {
  const {locale} = useAdminShell(); const l = locale === "es" ? {passwordError:"No se pudo verificar tu contraseña. Inténtalo de nuevo.", codeError:"El código de verificación no es válido. Inténtalo de nuevo.", active:"La autenticación de dos factores está activa para esta cuenta.", app:"Usa tu aplicación de autenticación al iniciar sesión.", return:"Volver a administración", add:"Agrega esta URI manualmente a una aplicación de autenticación. No la compartas.", recovery:"Códigos de recuperación", store:"Guarda estos códigos en un lugar seguro. Cada código se usa una vez y no se mostrará nuevamente.", code:"Código de tu aplicación de autenticación", confirming:"Confirmando…", confirm:"Confirmar autenticación de dos factores", protect:"Protege esta cuenta administrativa con una aplicación de autenticación. Recibirás códigos de recuperación durante la configuración.", current:"Contraseña actual", preparing:"Preparando…", setup:"Configurar autenticación de dos factores"} : {passwordError:"Your password could not be verified. Try again.", codeError:"The verification code is not valid. Try again.", active:"Two-factor authentication is active for this account.", app:"Use your authenticator app when signing in.", return:"Return to administration", add:"Add this setup URI manually to an authenticator app. Do not share it.", recovery:"Recovery codes", store:"Store these codes somewhere safe. Each code can be used once and will not be shown again.", code:"Code from your authenticator app", confirming:"Confirming…", confirm:"Confirm two-factor authentication", protect:"Protect this administrator account with an authenticator app. You will receive recovery codes during setup.", current:"Current password", preparing:"Preparing…", setup:"Set up two-factor authentication"};
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await authClient.twoFactor.enable({password, method: "totp", issuer: "Iglesia Plenitud en Cristo"});
    setLoading(false);
    if (result.error || result.data?.method !== "totp") { setError(l.passwordError); return; }
    setEnrollment({totpURI: result.data.totpURI, backupCodes: result.data.backupCodes});
  }

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const result = await authClient.twoFactor.verifyTotp({code});
    setLoading(false);
    if (result.error) { setError(l.codeError); return; }
    router.refresh();
  }

  if (enabled) return <><p>{l.active}</p><p>{l.app}</p><p><Link className="password-recovery-link" href="/admin">{l.return}</Link></p></>;
  if (enrollment) return <><p>{l.add}</p><code className="two-factor-uri">{enrollment.totpURI}</code><h2>{l.recovery}</h2><p>{l.store}</p><ul className="two-factor-codes">{enrollment.backupCodes.map((code) => <li key={code}>{code}</li>)}</ul><form className="admin-auth-form" onSubmit={confirmEnrollment}><label htmlFor="two-factor-setup-code">{l.code}</label><input id="two-factor-setup-code" name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required /><button type="submit" disabled={loading}>{loading ? l.confirming : l.confirm}</button>{error ? <p role="alert">{error}</p> : null}</form></>;
  return <><p>{l.protect}</p><form className="admin-auth-form" onSubmit={startEnrollment}><label htmlFor="two-factor-password">{l.current}</label><input id="two-factor-password" name="password" type="password" autoComplete="current-password" required /><button type="submit" disabled={loading}>{loading ? l.preparing : l.setup}</button>{error ? <p role="alert">{error}</p> : null}</form></>;
}
