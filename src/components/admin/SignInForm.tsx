"use client";

import {FormEvent, useState} from "react";
import {authClient} from "@/lib/auth-client";

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (result.error) setError("The email or password is not valid.");
  }

  return (
    <form onSubmit={onSubmit} className="admin-auth-form" noValidate>
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="admin-password">Password</label>
      <div className="password-field"><input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" className="password-visibility" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button></div>
      <a className="password-recovery-link" href="/admin/recover-password">Forgot your password?</a>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
