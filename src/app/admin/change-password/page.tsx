import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {ChangePasswordForm} from "@/components/admin/ChangePasswordForm";
export const instant = false;
export default async function ChangePasswordPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  return <main className="admin-shell" lang="en"><section className="admin-card"><p className="admin-eyebrow">Administration</p><h1>Set a new password</h1><p>Your temporary password must be changed before continuing.</p><ChangePasswordForm /></section></main>;
}
