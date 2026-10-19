import {TwoFactorChallenge} from "@/components/admin/TwoFactorChallenge";
import {cookies} from "next/headers";
import {AdminShellProvider} from "@/components/admin/AdminShellProvider";
import {ADMIN_LANGUAGE_COOKIE, resolveAdminLocale} from "@/i18n/admin-shell";

export const metadata = {title: "Verify sign-in | Iglesia Plenitud en Cristo"};
export const instant = false;

export default async function TwoFactorPage() {
  const locale = resolveAdminLocale((await cookies()).get(ADMIN_LANGUAGE_COOKIE)?.value); const spanish = locale === "es";
  return <AdminShellProvider initialLocale={locale}><main className="admin-shell" lang={locale}><section className="admin-card" aria-labelledby="two-factor-title"><p className="admin-eyebrow">{spanish ? "Administración" : "Administration"}</p><h1 id="two-factor-title">{spanish ? "Verifica tu inicio de sesión" : "Verify your sign-in"}</h1><p>{spanish ? "Ingresa el código de seis dígitos de tu aplicación de autenticación." : "Enter the six-digit code from your authenticator app."}</p><TwoFactorChallenge /></section></main></AdminShellProvider>;
}
