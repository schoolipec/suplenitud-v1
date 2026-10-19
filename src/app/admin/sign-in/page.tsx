import {SignInForm} from "@/components/admin/SignInForm";
import {cookies} from "next/headers";
import {AdminShellProvider} from "@/components/admin/AdminShellProvider";
import {AdminMantineProvider} from "@/components/admin/AdminMantineProvider";
import {ADMIN_LANGUAGE_COOKIE, resolveAdminLocale} from "@/i18n/admin-shell";

export const metadata = {title: "Admin sign in | Iglesia Plenitud en Cristo"};
export const instant = false;

export default async function AdminSignInPage() {
  const locale = resolveAdminLocale((await cookies()).get(ADMIN_LANGUAGE_COOKIE)?.value);
  const spanish = locale === "es";
  return (
    <AdminMantineProvider>
      <AdminShellProvider initialLocale={locale}><main className="admin-shell" lang={locale}>
      <section className="admin-card" aria-labelledby="admin-sign-in-title">
        <p className="admin-eyebrow">Iglesia Plenitud en Cristo</p>
        <h1 id="admin-sign-in-title">{spanish ? "Administración" : "Administration"}</h1>
        <p>{spanish ? "Inicia sesión para administrar la plataforma." : "Sign in to manage the platform."}</p>
        <SignInForm />
      </section>
    </main></AdminShellProvider>
    </AdminMantineProvider>
  );
}
