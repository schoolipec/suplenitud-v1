import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";
import {TwoFactorSetup} from "@/components/admin/TwoFactorSetup";

export const metadata = {title: "Security | Iglesia Plenitud en Cristo"};
export const instant = false;

export default async function SecurityPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");

  const user = await prisma.user.findUnique({where: {id: session.user.id}, select: {mustChangePassword: true, twoFactorEnabled: true}});
  if (user?.mustChangePassword) redirect("/admin/change-password");

  return <main className="admin-shell" lang="en"><section className="admin-card" aria-labelledby="security-title"><p className="admin-eyebrow">Security</p><h1 id="security-title">Two-factor authentication</h1><TwoFactorSetup enabled={user?.twoFactorEnabled ?? false} /></section></main>;
}
