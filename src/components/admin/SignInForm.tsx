"use client";

import {FormEvent, useState} from "react";
import Link from "next/link";
import {authClient} from "@/lib/auth-client";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

function EyeIcon({hidden}: {hidden: boolean}) { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>{hidden ? <path d="M3 3l18 18"/> : null}</svg>; }

export function SignInForm() {
  const {locale} = useAdminShell(); const l = locale === "es" ? {email:"Correo", password:"Contraseña", invalid:"El correo o la contraseña no son válidos.", hide:"Ocultar contraseña", show:"Mostrar contraseña", forgot:"¿Olvidaste tu contraseña?", signing:"Iniciando sesión…", signIn:"Iniciar sesión"} : {email:"Email", password:"Password", invalid:"The email or password is not valid.", hide:"Hide password", show:"Show password", forgot:"Forgot your password?", signing:"Signing in…", signIn:"Sign in"};
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [showPassword, setShowPassword] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(null); const form = new FormData(event.currentTarget); const result = await authClient.signIn.email({email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), callbackURL: "/admin"}); setLoading(false); if (result.error) setError(l.invalid); }
  return <form onSubmit={onSubmit} className="admin-auth-form" noValidate><label htmlFor="admin-email">{l.email}</label><input id="admin-email" name="email" type="email" autoComplete="email" required /><label htmlFor="admin-password">{l.password}</label><div className="password-field"><input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" className="password-visibility" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? l.hide : l.show} aria-pressed={showPassword}><EyeIcon hidden={showPassword}/></button></div><Link className="password-recovery-link" href="/admin/recover-password">{l.forgot}</Link>{error ? <p role="alert">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? l.signing : l.signIn}</button></form>;
}
