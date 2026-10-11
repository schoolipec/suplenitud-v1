import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canAccessAdmin} from "@/lib/access";
import {prisma} from "@/lib/db/client";

export const metadata = {title: "Administration | Iglesia Plenitud en Cristo"};
export const instant = false;

export default async function AdminPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");

  const assignments = await prisma.userRole.findMany({
    where: {userId: session.user.id},
    select: {role: true},
  });
  const roles = assignments.map(({role}) => role);
  if (!canAccessAdmin(roles)) redirect("/admin/sign-in?error=unauthorized");

  return (
    <main className="admin-shell" lang="en">
      <section className="admin-card" aria-labelledby="admin-title">
        <p className="admin-eyebrow">Administration</p>
        <h1 id="admin-title">Welcome, {session.user.name}</h1>
        <p>Your access level: {roles.join(", ")}</p>
        <p>Content, prayer requests, and finance modules will appear here as their approved phases are completed.</p>
      </section>
    </main>
  );
}
