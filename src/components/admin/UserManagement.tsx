"use client";

import {FormEvent, useState} from "react";

type ManagedUser = {id: string; name: string; email: string; createdAt: string; twoFactorEnabled: boolean; roles: string[]};

export function UserManagement({initialUsers}: {initialUsers: ManagedUser[]}) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const response = await fetch("/api/admin/users", {cache: "no-store"});
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) { setMessage("The user list could not be loaded."); return; }
    setUsers(data.users);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({name: form.get("name"), email: form.get("email"), temporaryPassword: form.get("temporaryPassword"), role: form.get("role")})});
    if (!response.ok) { setMessage("The user could not be created. Verify the information and try again."); return; }
    event.currentTarget.reset(); setMessage("User created. Share the temporary password through a secure channel."); await loadUsers();
  }

  return <div className="admin-users"><section className="admin-section"><div className="admin-section-heading"><div><h2>Users</h2><p>Accounts and access roles for the platform.</p></div></div>{loading ? <p>Loading users…</p> : <div className="admin-table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Two-factor</th><th>Created</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><span>{user.email}</span></td><td>{user.roles.join(", ")}</td><td>{user.twoFactorEnabled ? "Active" : "Not configured"}</td><td>{new Intl.DateTimeFormat("en-US", {dateStyle: "medium"}).format(new Date(user.createdAt))}</td></tr>)}</tbody></table></div>}</section><section className="admin-section"><h2>Create user</h2><p>The temporary password must be changed on first sign-in.</p><form onSubmit={onSubmit} className="admin-auth-form"><label htmlFor="user-name">Name</label><input id="user-name" name="name" required/><label htmlFor="user-email">Email</label><input id="user-email" name="email" type="email" required/><label htmlFor="user-role">Role</label><select id="user-role" name="role" defaultValue="ADMIN"><option value="ADMIN">Admin</option><option value="TREASURER">Treasurer</option><option value="USHER">Usher — no panel access</option></select><label htmlFor="user-temporary-password">Temporary password</label><input id="user-temporary-password" name="temporaryPassword" type="password" autoComplete="new-password" minLength={16} required/><button type="submit">Create user</button>{message ? <p role="status">{message}</p> : null}</form></section></div>;
}
