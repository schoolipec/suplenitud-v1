"use client";
import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";

export function ChangePasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/change-password", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword")})});
    if (!response.ok) { setMessage("The password could not be changed. Verify the current password and try again."); return; }
    router.push("/admin");
  }
  return <form onSubmit={onSubmit} className="admin-auth-form"><label htmlFor="current-password">Temporary password</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /><label htmlFor="new-password">New password</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={16} required /><button type="submit">Save new password</button>{message ? <p role="alert">{message}</p> : null}</form>;
}
