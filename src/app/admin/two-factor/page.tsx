import {TwoFactorChallenge} from "@/components/admin/TwoFactorChallenge";

export const metadata = {title: "Verify sign-in | Iglesia Plenitud en Cristo"};

export default function TwoFactorPage() {
  return <main className="admin-shell" lang="en"><section className="admin-card" aria-labelledby="two-factor-title"><p className="admin-eyebrow">Administration</p><h1 id="two-factor-title">Verify your sign-in</h1><p>Enter the six-digit code from your authenticator app.</p><TwoFactorChallenge /></section></main>;
}
