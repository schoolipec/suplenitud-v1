"use client";

import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

export function TwoFactorChallenge() {
  const {locale} = useAdminShell(); const l = locale === "es" ? {error:"El código de verificación no es válido. Inténtalo de nuevo.", label:"Código de autenticación", verifying:"Verificando…", verify:"Verificar y continuar"} : {error:"The verification code is not valid. Try again.", label:"Authentication code", verifying:"Verifying…", verify:"Verify and continue"};
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(null);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const result = await authClient.twoFactor.verifyTotp({code});
    setLoading(false);
    if (result.error) { setError(l.error); return; }
    router.replace("/admin"); router.refresh();
  }

  return <form className="admin-auth-form" onSubmit={onSubmit}><label htmlFor="two-factor-code">{l.label}</label><input id="two-factor-code" name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required /><button type="submit" disabled={loading}>{loading ? l.verifying : l.verify}</button>{error ? <p role="alert">{error}</p> : null}</form>;
}
