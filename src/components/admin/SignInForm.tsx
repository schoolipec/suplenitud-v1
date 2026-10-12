"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {authClient} from "@/lib/auth-client";

function EyeIcon({hidden}: {hidden: boolean}) { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>{hidden ? <path d="M3 3l18 18"/> : null}</svg>; }

export function SignInForm() {
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [showPassword, setShowPassword] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(null); const form = new FormData(event.currentTarget); const result = await authClient.signIn.email({email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), callbackURL: "/admin"}); setLoading(false); if (result.error) setError("The email or password is not valid."); }
  return <form onSubmit={onSubmit} className="admin-auth-form" noValidate><label htmlFor="admin-email">Email</label><input id="admin-email" name="email" type="email" autoComplete="email" required /><label htmlFor="admin-password">Password</label><div className="password-field"><input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" className="password-visibility" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><EyeIcon hidden={showPassword}/></button></div><Link className="password-recovery-link" href="/admin/recover-password">Forgot your password?</Link>{error ? <p role="alert">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form>;
}
