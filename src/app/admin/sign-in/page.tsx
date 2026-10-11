import {SignInForm} from "@/components/admin/SignInForm";

export const metadata = {title: "Admin sign in | Iglesia Plenitud en Cristo"};

export default function AdminSignInPage() {
  return (
    <main className="admin-shell" lang="en">
      <section className="admin-card" aria-labelledby="admin-sign-in-title">
        <p className="admin-eyebrow">Iglesia Plenitud en Cristo</p>
        <h1 id="admin-sign-in-title">Administration</h1>
        <p>Sign in to manage the platform.</p>
        <SignInForm />
      </section>
    </main>
  );
}
