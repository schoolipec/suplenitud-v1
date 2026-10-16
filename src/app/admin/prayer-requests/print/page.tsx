import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {canViewPrayerRequests} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {parsePrayerFilters, prayerPageParams, prayerQueueWhere, prayerStatusLabel, PRAYER_QUEUE_SELECT} from "@/lib/prayer-queue";

export const instant = false;
export const metadata = {title: "Print prayer requests | Iglesia Plenitud en Cristo"};

export default async function PrintPrayerRequestsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
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

  const parsed = parsePrayerFilters(prayerPageParams(await searchParams));
  if (!parsed.ok) return <main className="print-page"><p role="alert">Filtros inválidos. Revisa el estado, la búsqueda y las fechas.</p></main>;
  const requests = await prisma.prayerRequest.findMany({
    where: prayerQueueWhere(parsed.filters, true),
    orderBy: [{createdAt: "desc"}, {id: "desc"}],
    select: PRAYER_QUEUE_SELECT,
  });

  const generatedAt = new Date().toLocaleString("es-US", {dateStyle: "full", timeStyle: "short", timeZone: "America/Los_Angeles"});

  return (
    <main className="print-page">
      <header className="print-header">
        <h1>Peticiones de oración — Uso pastoral</h1>
        <p>Generado: {generatedAt}</p>
        <p className="print-notice">Para uso pastoral colectivo. No distribuir. Se excluyen registros históricos.</p>
      </header>

      {requests.length === 0 ? (
        <p className="print-empty">No hay peticiones con los filtros seleccionados.</p>
      ) : (
        <div className="print-list">
          {requests.map((request) => (
            <article key={request.id} className="print-item">
              <header>
                <h2>{request.name}</h2>
                <time>{request.createdAt.toISOString().slice(0, 10)} (UTC)</time>
              </header>
              <p style={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>{request.message}</p>
              <footer>
                <span>Estado: {prayerStatusLabel(request)}</span>
              </footer>
            </article>
          ))}
        </div>
      )}

      <footer className="print-footer">
        <p>Iglesia Plenitud en Cristo — Documento pastoral interno</p>
      </footer>
    </main>
  );
}
