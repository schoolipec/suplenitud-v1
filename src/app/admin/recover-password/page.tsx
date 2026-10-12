import Link from "next/link";

export const metadata = {title: "Password recovery | Iglesia Plenitud en Cristo"};

export default function RecoverPasswordPage() {
  return <main className="admin-shell" lang="en"><section className="admin-card"><p className="admin-eyebrow">Administration</p><h1>Password recovery</h1><p>Password recovery by email is being configured. Until it is enabled, please contact the SuperAdmin to reset access.</p><Link className="text-link" href="/admin/sign-in">Back to sign in</Link></section></main>;
}
