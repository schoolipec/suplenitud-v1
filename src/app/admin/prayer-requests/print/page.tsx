import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewPrayerRequests} from "@/lib/access";
import {prisma} from "@/lib/db/client";

export const instant = false;
export const metadata = {title: "Print prayer requests | Iglesia Plenitud en Cristo"};

export default async function PrintPrayerRequestsPage() {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {active: true, mustChangePassword: true, roles: {select: {role: true}}},
  });
  if (!user?.active) redirect("/admin/sign-in?error=deactivated");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const roles = user.roles.map(({role}) => role);
  if (!canViewPrayerRequests(roles)) redirect("/admin/sign-in?error=unauthorized");

  const url = new URL((await headers()).get("referer") || "http://localhost/admin/prayer-requests/print");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const where: Record<string, unknown> = {requestType: "PRAYER_ONLY"};

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    }
    if (dateTo) {
      (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
    }
  }

  const requests = await prisma.prayerRequest.findMany({
    where,
    orderBy: {createdAt: "desc"},
    select: {
      id: true,
      createdAt: true,
      name: true,
      message: true,
      status: true,
    },
  });

  const generatedAt = new Date().toLocaleString("en-US", {dateStyle: "full", timeStyle: "short"});

  return (
    <main className="print-page">
      <header className="print-header">
        <h1>Prayer Requests — Pastoral Use</h1>
        <p>Generated: {generatedAt}</p>
        <p className="print-notice">For collective pastoral use. Do not distribute.</p>
      </header>

      {requests.length === 0 ? (
        <p className="print-empty">No prayer requests found for the selected period.</p>
      ) : (
        <div className="print-list">
          {requests.map((request) => (
            <article key={request.id} className="print-item">
              <header>
                <h2>{request.name}</h2>
                <time>{new Date(request.createdAt).toLocaleDateString("en-US", {dateStyle: "medium"})}</time>
              </header>
              <p>{request.message}</p>
              <footer>
                <span>Status: {request.status}</span>
              </footer>
            </article>
          ))}
        </div>
      )}

      <footer className="print-footer">
        <p>Iglesia Plenitud en Cristo — Internal pastoral document</p>
      </footer>
    </main>
  );
}
