"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {authClient} from "@/lib/auth-client";

type Enrollment = {totpURI: string; backupCodes: string[]};

export function TwoFactorSetup({enabled}: {enabled: boolean}) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await authClient.twoFactor.enable({password, method: "totp", issuer: "Iglesia Plenitud en Cristo"});
    setLoading(false);
    if (result.error || result.data?.method !== "totp") { setError("Your password could not be verified. Try again."); return; }
    setEnrollment({totpURI: result.data.totpURI, backupCodes: result.data.backupCodes});
  }

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const result = await authClient.twoFactor.verifyTotp({code});
    setLoading(false);
    if (result.error) { setError("The verification code is not valid. Try again."); return; }
    router.refresh();
  }

  if (enabled) return <><p>Two-factor authentication is active for this account.</p><p>Use your authenticator app when signing in.</p><p><Link className="password-recovery-link" href="/admin">Return to administration</Link></p></>;
  if (enrollment) return <><p>Add this setup URI manually to an authenticator app. Do not share it.</p><code className="two-factor-uri">{enrollment.totpURI}</code><h2>Recovery codes</h2><p>Store these codes somewhere safe. Each code can be used once and will not be shown again.</p><ul className="two-factor-codes">{enrollment.backupCodes.map((code) => <li key={code}>{code}</li>)}</ul><form className="admin-auth-form" onSubmit={confirmEnrollment}><label htmlFor="two-factor-setup-code">Code from your authenticator app</label><input id="two-factor-setup-code" name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required /><button type="submit" disabled={loading}>{loading ? "Confirming…" : "Confirm two-factor authentication"}</button>{error ? <p role="alert">{error}</p> : null}</form></>;
  return <><p>Protect this administrator account with an authenticator app. You will receive recovery codes during setup.</p><form className="admin-auth-form" onSubmit={startEnrollment}><label htmlFor="two-factor-password">Current password</label><input id="two-factor-password" name="password" type="password" autoComplete="current-password" required /><button type="submit" disabled={loading}>{loading ? "Preparing…" : "Set up two-factor authentication"}</button>{error ? <p role="alert">{error}</p> : null}</form></>;
}
