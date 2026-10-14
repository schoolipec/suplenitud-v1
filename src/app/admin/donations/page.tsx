import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {auth} from "@/lib/auth";
import {canViewDonations} from "@/lib/access";
import {prisma} from "@/lib/db/client";
import {AdminFrame} from "@/components/admin/AdminFrame";
import {getPaymentsStatus} from "@/lib/payments/config";
import {IconHeartHandshake} from "@tabler/icons-react";

export const instant = false;
export const metadata = {title: "Donations | Iglesia Plenitud en Cristo"};

const STATUSES = ["PENDING", "APPROVED", "COMPLETED", "FAILED", "CANCELLED", "CONFIRMED", "REFUNDED"] as const;
const PROVIDERS = ["PAYPAL", "SQUARE"] as const;

function shortRef(ref: string): string {
  return ref.length > 18 ? `${ref.slice(0, 8)}…${ref.slice(-6)}` : ref;
}

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{status?: string; provider?: string; detail?: string}>;
}) {
  const session = await auth.api.getSession({headers: await headers()});
  if (!session?.user) redirect("/admin/sign-in");
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {mustChangePassword: true, roles: {select: {role: true}}},
  });
  if (user?.mustChangePassword) redirect("/admin/change-password");
  const roles = user?.roles.map(({role}) => role) ?? [];
  if (!canViewDonations(roles)) redirect("/admin/sign-in?error=unauthorized");
  const diagnosticsVisible = roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");

  const params = await searchParams;
  const statusFilter = (STATUSES as readonly string[]).includes(params.status ?? "") ? params.status! : "ALL";
  const providerFilter = (PROVIDERS as readonly string[]).includes(params.provider ?? "") ? params.provider! : "ALL";
  const where = {
    ...(statusFilter === "ALL" ? {} : {status: statusFilter as (typeof STATUSES)[number]}),
    ...(providerFilter === "ALL" ? {} : {provider: providerFilter}),
  };

  const [rows, byStatus, byProvider, detail] = await Promise.all([
    prisma.donation.findMany({where, orderBy: {createdAt: "desc"}, take: 100}),
    prisma.donation.groupBy({by: ["status"], _count: {_all: true}}),
    prisma.donation.groupBy({by: ["provider"], _count: {_all: true}}),
    typeof params.detail === "string" && params.detail.length > 0
      ? prisma.donation.findUnique({
          where: {id: params.detail},
          include: {webhookEvents: {orderBy: {receivedAt: "desc"}}},
        })
      : null,
  ]);
  const payments = getPaymentsStatus();

  return (
    <AdminFrame roles={roles} title="Donations">
      <p className="admin-intro">
        Reconciliation for hosted offerings. Card data is never captured or stored here; only verified
        provider webhooks move money states. Online giving is currently {payments.enabled ? "enabled" : "disabled"}.
      </p>

      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <IconHeartHandshake className="admin-card-icon" size={22} stroke={1.75} aria-hidden />
          <span>Records in filter</span>
          <strong>{rows.length}</strong>
          <small>Latest 100 shown</small>
        </div>
        {byStatus.map((row) => (
          <div className="admin-summary-card" key={row.status}>
            <span>{row.status}</span>
            <strong>{row._count._all}</strong>
            <small>All providers</small>
          </div>
        ))}
        {byProvider.map((row) => (
          <div className="admin-summary-card" key={row.provider}>
            <span>{row.provider}</span>
            <strong>{row._count._all}</strong>
            <small>All states</small>
          </div>
        ))}
      </div>

      <div className="admin-data-grid">
        <section className="admin-section">
          <h2>Records</h2>
          <form className="admin-toolbar" method="get" action="/admin/donations">
            <div className="admin-toolbar-filters">
              <label htmlFor="donation-status-filter" className="admin-sr-only">Filter by status</label>
              <select id="donation-status-filter" name="status" defaultValue={statusFilter}>
                <option value="ALL">All states</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <label htmlFor="donation-provider-filter" className="admin-sr-only">Filter by provider</label>
              <select id="donation-provider-filter" name="provider" defaultValue={providerFilter}>
                <option value="ALL">All providers</option>
                {PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
              <button type="submit" className="admin-button-secondary admin-button-small">Apply filters</button>
            </div>
          </form>
          {rows.length === 0 ? (
            <p className="admin-empty">No donation records match the current filters.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th><span className="admin-sr-only">Detail</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Date">{new Date(item.createdAt).toLocaleDateString("en-US")}</td>
                      <td data-label="Reference" title={item.externalReference}>{shortRef(item.externalReference)}</td>
                      <td data-label="Amount">{item.amount.toString()} {item.currency}</td>
                      <td data-label="Provider">{item.provider}</td>
                      <td data-label="Status">
                        <span className={item.status === "COMPLETED" ? "admin-badge admin-badge-success" : item.status === "FAILED" ? "admin-badge admin-badge-danger" : "admin-badge"}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="admin-action-link"
                          href={`/admin/donations?status=${statusFilter}&provider=${providerFilter}&detail=${item.id}`}
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-section">
          <h2>Detail</h2>
          {!detail ? (
            <p className="admin-empty">Select Detail on any row to inspect references, state and webhook history.</p>
          ) : (
            <dl className="admin-user-detail">
              <div><dt>Reference</dt><dd>{detail.externalReference}</dd></div>
              <div><dt>Amount</dt><dd>{detail.amount.toString()} {detail.currency}</dd></div>
              <div><dt>Provider</dt><dd>{detail.provider}</dd></div>
              <div><dt>Status</dt><dd>{detail.status}</dd></div>
              <div><dt>Campaign</dt><dd>{detail.campaign}</dd></div>
              <div><dt>Fund</dt><dd>{detail.fund ?? "—"}</dd></div>
              <div><dt>Reconciled</dt><dd>{detail.reconciledAt ? new Date(detail.reconciledAt).toLocaleString("en-US") : "—"}</dd></div>
              <div><dt>Created</dt><dd>{new Date(detail.createdAt).toLocaleString("en-US")}</dd></div>
            </dl>
          )}
          {detail && detail.webhookEvents.length > 0 ? (
            <ul className="admin-audit-list">
              {detail.webhookEvents.map((event) => (
                <li key={event.id}>
                  <strong>{event.eventType}</strong>
                  <span>
                    {event.verified ? "verified" : "unverified"} · {event.processed ? "processed" : "pending"} ·{" "}
                    {new Date(event.receivedAt).toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      {diagnosticsVisible ? (
        <div className="admin-data-grid">
          <section className="admin-section">
            <h2>Configuration state</h2>
            <p className="admin-field-note">Readiness labels only. Secrets are never shown, edited or stored here.</p>
            <dl className="admin-user-detail">
              <div><dt>Enabled</dt><dd>{payments.enabled ? "Yes" : "No"}</dd></div>
              <div><dt>Mode</dt><dd>{payments.mode}</dd></div>
              <div><dt>PayPal</dt><dd>{payments.paypal}</dd></div>
              <div><dt>Square</dt><dd>{payments.square}</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
    </AdminFrame>
  );
}
