import Link from "next/link";
import {IconHeartHandshake} from "@tabler/icons-react";
import type {PaymentsStatus} from "@/lib/payments/config";

export type DonationRow = {
  id: string;
  externalReference: string;
  amount: string;
  currency: string;
  provider: string;
  campaign: string;
  fund: string | null;
  status: string;
  reconciledAt: string | null;
  createdAt: string;
};

export type DonationDetail = DonationRow & {
  webhookEvents: {id: string; eventType: string; verified: boolean; processed: boolean; receivedAt: string}[];
};

function shortRef(ref: string): string {
  return ref.length > 18 ? `${ref.slice(0, 8)}…${ref.slice(-6)}` : ref;
}

const STATUSES = ["PENDING", "APPROVED", "COMPLETED", "FAILED", "CANCELLED", "CONFIRMED", "REFUNDED"];
const PROVIDERS = ["PAYPAL", "SQUARE"];

export function DonationsConsole({
  rows,
  byStatus,
  byProvider,
  detail,
  payments,
  statusFilter,
  providerFilter,
  diagnosticsVisible,
}: {
  rows: DonationRow[];
  byStatus: {status: string; count: number}[];
  byProvider: {provider: string; count: number}[];
  detail: DonationDetail | null;
  payments: PaymentsStatus;
  statusFilter: string;
  providerFilter: string;
  diagnosticsVisible: boolean;
}) {
  return (
    <>
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
            <strong>{row.count}</strong>
            <small>All providers</small>
          </div>
        ))}
        {byProvider.map((row) => (
          <div className="admin-summary-card" key={row.provider}>
            <span>{row.provider}</span>
            <strong>{row.count}</strong>
            <small>All states</small>
          </div>
        ))}
      </div>

      <div className="admin-data-grid">
        <section className="admin-section admin-section-full">
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
                      <td data-label="Amount">{item.amount} {item.currency}</td>
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
              <div><dt>Amount</dt><dd>{detail.amount} {detail.currency}</dd></div>
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
    </>
  );
}
