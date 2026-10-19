"use client";
import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {useAdminShell} from "@/components/admin/AdminShellProvider";

export function ChangePasswordForm() {
  const {locale} = useAdminShell(); const l = locale === "es" ? {error:"No se pudo cambiar la contraseña. Verifica la contraseña actual e inténtalo de nuevo.", temporary:"Contraseña temporal", next:"Contraseña nueva", save:"Guardar nueva contraseña"} : {error:"The password could not be changed. Verify the current password and try again.", temporary:"Temporary password", next:"New password", save:"Save new password"};
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/change-password", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword")})});
    if (!response.ok) { setMessage(l.error); return; }
    router.push("/admin");
  }
  return <form onSubmit={onSubmit} className="admin-auth-form"><label htmlFor="current-password">{l.temporary}</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /><label htmlFor="new-password">{l.next}</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={16} required /><button type="submit">{l.save}</button>{message ? <p role="alert">{message}</p> : null}</form>;
}
