"use client";

import {FormEvent, useEffect, useState} from "react";
import {useParams} from "next/navigation";

const copy = {
  title: "Set your password",
  intro: "Choose a password of at least 8 characters to activate your account.",
  password: "New password",
  confirm: "Confirm password",
  submit: "Activate account",
  submitting: "Activating…",
  mismatch: "Passwords do not match.",
  tooShort: "Use at least 8 characters.",
  success: "Your account is active. You can now sign in from the administration page.",
  invalid: "This invitation link is invalid, expired, used, or revoked. Ask an administrator for a new one.",
  checking: "Checking invitation…",
} as const;

export default function InviteTokenPage() {
  const params = useParams<{token: string}>();
  const token = params.token;
  const [state, setState] = useState<"checking" | "valid" | "invalid">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`, {cache: "no-store"})
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (data?.valid) {
          setEmail(data.email ?? "");
          setState("valid");
        } else {
          setState("invalid");
        }
      })
      .catch(() => {
        if (!cancelled) setState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage(copy.mismatch);
      return;
    }
    if (password.length < 8) {
      setMessage(copy.tooShort);
      return;
    }
    setSubmitting(true);
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({token, password}),
    });
    const data = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) {
      setMessage(data?.error === "password_too_short" ? copy.tooShort : copy.invalid);
      if (data?.error && data.error !== "password_too_short") setState("invalid");
      return;
    }
    setDone(true);
  }

  return (
    <main className="admin-shell" lang="en">
      <div className="admin-card">
        <p className="admin-eyebrow">Iglesia Plenitud en Cristo</p>
        <h1>{copy.title}</h1>
        {state === "checking" ? <p role="status">{copy.checking}</p> : null}
        {state === "invalid" && !done ? <p role="alert">{copy.invalid}</p> : null}
        {done ? (
          <p role="status">{copy.success}</p>
        ) : state === "valid" ? (
          <form className="admin-auth-form" onSubmit={submit}>
            {email ? <p className="admin-field-note">Invitation for {email}</p> : null}
            <p>{copy.intro}</p>
            <div>
              <label htmlFor="invite-password">{copy.password}</label>
              <input
                id="invite-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            <div>
              <label htmlFor="invite-confirm">{copy.confirm}</label>
              <input
                id="invite-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            {message ? <p role="alert">{message}</p> : null}
            <button type="submit" disabled={submitting}>{submitting ? copy.submitting : copy.submit}</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
