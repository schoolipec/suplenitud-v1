"use client";

import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {authClient} from "@/lib/auth-client";

export function TwoFactorChallenge() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(null);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const result = await authClient.twoFactor.verifyTotp({code});
    setLoading(false);
    if (result.error) { setError("The verification code is not valid. Try again."); return; }
    router.replace("/admin"); router.refresh();
  }

  return <form className="admin-auth-form" onSubmit={onSubmit}><label htmlFor="two-factor-code">Authentication code</label><input id="two-factor-code" name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required /><button type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify and continue"}</button>{error ? <p role="alert">{error}</p> : null}</form>;
}
