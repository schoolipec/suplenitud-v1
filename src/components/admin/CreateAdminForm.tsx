"use client";

import {FormEvent, useState} from "react";

export function CreateAdminForm() {
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({name: form.get("name"), email: form.get("email"), temporaryPassword: form.get("temporaryPassword")}),
    });
    if (!response.ok) {
      setMessage("The administrator could not be created. Verify the information and try again.");
      return;
    }
    event.currentTarget.reset();
    setMessage("Administrator created. Provide the temporary password through a secure channel.");
  }
  return <form onSubmit={onSubmit} className="admin-auth-form"><h2>Create administrator</h2><label htmlFor="admin-name">Name</label><input id="admin-name" name="name" required /><label htmlFor="new-admin-email">Email</label><input id="new-admin-email" name="email" type="email" required /><label htmlFor="new-admin-password">Temporary password</label><input id="new-admin-password" name="temporaryPassword" type="password" minLength={16} required /><button type="submit">Create Admin</button>{message ? <p role="status">{message}</p> : null}</form>;
}
