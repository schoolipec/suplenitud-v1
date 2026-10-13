"use client";

import {useState} from "react";
import {IconChevronDown, IconChevronUp, IconDownload, IconPrinter, IconRefresh, IconSearch} from "@tabler/icons-react";

type PrayerRequest = {
  id: string;
  name: string;
  message: string;
  email: string | null;
  requestType: "PRAYER_ONLY" | "PRAYER_AND_CONTACT";
  country: string | null;
  contactChannel: "PHONE" | "WHATSAPP" | null;
  phone: string | null;
  whatsapp: string | null;
  timeZone: string | null;
  availabilitySlotId: string | null;
  status: "NEW" | "PENDING_ASSIGNMENT" | "ASSIGNED" | "CONTACTED" | "CLOSED";
  createdAt: string;
  assignments: Array<{
    id: string;
    contact: {id: string; name: string; ministry: string; locale: string} | null;
  }>;
};

type MinistryContact = {
  id: string;
  name: string;
  ministry: string;
  locale: string;
  phone: string | null;
  whatsapp: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  PENDING_ASSIGNMENT: "Pending assignment",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
};

const TYPE_LABELS: Record<string, string> = {
  PRAYER_ONLY: "Prayer only",
  PRAYER_AND_CONTACT: "Prayer + contact",
};

export function PrayerRequestsQueue({initialRequests}: {initialRequests: PrayerRequest[]}) {
  const [requests, setRequests] = useState<PrayerRequest[]>(initialRequests);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MinistryContact[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadRequests() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (typeFilter !== "ALL") params.set("requestType", typeFilter);
    if (countryFilter !== "ALL") params.set("country", countryFilter);
    if (channelFilter !== "ALL") params.set("contactChannel", channelFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (query) params.set("search", query);

    const response = await fetch(`/api/admin/prayer-requests?${params}`, {cache: "no-store"});
    const data = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setMessage("The request list could not be loaded.");
      return;
    }
    setRequests(data.requests);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadCandidates() {
    const response = await fetch(`/api/admin/ministry-contacts?available=true`);
    const data = await response.json().catch(() => null);
    if (response.ok) {
      setCandidates(data.contacts || []);
    }
  }

  async function assignContact(requestId: string, contactId: string) {
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/prayer-requests/${requestId}`, {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({contactId}),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("The assignment could not be completed.");
      return;
    }
    setAssigningId(null);
    setCandidates([]);
    setMessage("Contact assigned.");
    await loadRequests();
  }

  async function changeStatus(requestId: string, status: string) {
    setMessage(null);
    setSaving(true);
    const response = await fetch(`/api/admin/prayer-requests/${requestId}`, {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({status}),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("The status could not be updated.");
      return;
    }
    setMessage("Status updated.");
    await loadRequests();
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (typeFilter !== "ALL") params.set("filter", typeFilter === "PRAYER_ONLY" ? "prayer_only" : "contact");
    else params.set("filter", "all");
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/admin/prayer-requests/export?${params}`, "_blank");
  }

  function printView() {
    window.open("/admin/prayer-requests/print", "_blank");
  }

  const filtered = requests.filter((request) => {
    const haystack = `${request.name} ${request.message} ${request.email || ""}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    return true;
  });

  const countries = Array.from(new Set(requests.map((r) => r.country).filter(Boolean))) as string[];

  return (
    <div className="admin-prayer-requests">
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2>Prayer requests</h2>
            <p>Pastoral follow-up queue with assignment and tracking.</p>
          </div>
          <div className="admin-section-actions">
            <button type="button" className="admin-button-secondary" onClick={loadRequests} disabled={loading}>
              <IconRefresh size={17} aria-hidden />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button type="button" className="admin-button-secondary" onClick={exportCSV}>
              <IconDownload size={17} aria-hidden />
              Export CSV
            </button>
            <button type="button" className="admin-button-secondary" onClick={printView}>
              <IconPrinter size={17} aria-hidden />
              Print view
            </button>
          </div>
        </div>

        {message ? <p className="admin-status-message" role="status">{message}</p> : null}

        <div className="admin-toolbar">
          <div className="admin-toolbar-search">
            <IconSearch size={17} aria-hidden />
            <label htmlFor="prayer-search" className="admin-sr-only">Search requests</label>
            <input id="prayer-search" type="search" placeholder="Search by name, message or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="admin-toolbar-filters">
            <label htmlFor="prayer-status-filter" className="admin-sr-only">Filter by status</label>
            <select id="prayer-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="NEW">New</option>
              <option value="PENDING_ASSIGNMENT">Pending assignment</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CLOSED">Closed</option>
            </select>
            <label htmlFor="prayer-type-filter" className="admin-sr-only">Filter by type</label>
            <select id="prayer-type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="ALL">All types</option>
              <option value="PRAYER_ONLY">Prayer only</option>
              <option value="PRAYER_AND_CONTACT">Prayer + contact</option>
            </select>
            <label htmlFor="prayer-country-filter" className="admin-sr-only">Filter by country</label>
            <select id="prayer-country-filter" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
              <option value="ALL">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label htmlFor="prayer-channel-filter" className="admin-sr-only">Filter by channel</label>
            <select id="prayer-channel-filter" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="ALL">All channels</option>
              <option value="PHONE">Phone</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <label htmlFor="prayer-date-from" className="admin-sr-only">From date</label>
            <input id="prayer-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <label htmlFor="prayer-date-to" className="admin-sr-only">To date</label>
            <input id="prayer-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        {loading && requests.length === 0 ? <p>Loading requests…</p> : null}

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Type</th>
                <th>Country</th>
                <th>Status</th>
                <th>Date</th>
                <th><span className="admin-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => {
                const expanded = expandedIds.has(request.id);
                const assignment = request.assignments[0];
                return (
                  <PrayerRequestRow
                    key={request.id}
                    request={request}
                    expanded={expanded}
                    assignment={assignment}
                    saving={saving}
                    candidates={candidates}
                    assigning={assigningId === request.id}
                    onToggleExpand={() => toggleExpand(request.id)}
                    onAssign={() => { setAssigningId(request.id); loadCandidates(); }}
                    onCancelAssign={() => { setAssigningId(null); setCandidates([]); }}
                    onAssignContact={(contactId) => assignContact(request.id, contactId)}
                    onChangeStatus={(status) => changeStatus(request.id, status)}
                  />
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty">
                      <p>No requests match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PrayerRequestRow({
  request,
  expanded,
  assignment,
  saving,
  candidates,
  assigning,
  onToggleExpand,
  onAssign,
  onCancelAssign,
  onAssignContact,
  onChangeStatus,
}: {
  request: PrayerRequest;
  expanded: boolean;
  assignment: {id: string; contact: {id: string; name: string; ministry: string; locale: string} | null} | undefined;
  saving: boolean;
  candidates: MinistryContact[];
  assigning: boolean;
  onToggleExpand: () => void;
  onAssign: () => void;
  onCancelAssign: () => void;
  onAssignContact: (contactId: string) => void;
  onChangeStatus: (status: string) => void;
}) {
  const createdDate = new Date(request.createdAt).toLocaleDateString("en-US", {dateStyle: "medium"});

  return (
    <>
      <tr className={expanded ? "is-expanded" : ""}>
        <td data-label="Request">
          <div className="admin-user-cell">
            <strong>{request.name}</strong>
            <span>{request.message.substring(0, 80)}{request.message.length > 80 ? "…" : ""}</span>
          </div>
        </td>
        <td data-label="Type">
          <span className="admin-badge">{TYPE_LABELS[request.requestType] || request.requestType}</span>
        </td>
        <td data-label="Country">{request.country || "—"}</td>
        <td data-label="Status">
          <span className={`admin-badge ${request.status === "NEW" ? "admin-badge-success" : request.status === "CLOSED" ? "admin-badge-muted" : ""}`}>
            {STATUS_LABELS[request.status] || request.status}
          </span>
        </td>
        <td data-label="Date">{createdDate}</td>
        <td className="admin-col-actions">
          <div className="admin-row-actions">
            <button type="button" className="admin-icon-button" onClick={onToggleExpand} aria-expanded={expanded} aria-label={expanded ? `Hide details for ${request.name}` : `Show details for ${request.name}`}>
              {expanded ? <IconChevronUp size={17} aria-hidden /> : <IconChevronDown size={17} aria-hidden />}
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="admin-detail-row">
          <td colSpan={6}>
            <div className="admin-prayer-detail">
              <dl className="admin-prayer-detail-list">
                <div><dt>Name</dt><dd>{request.name}</dd></div>
                <div><dt>Email</dt><dd>{request.email || "—"}</dd></div>
                <div><dt>Message</dt><dd>{request.message}</dd></div>
                {request.requestType === "PRAYER_AND_CONTACT" && (
                  <>
                    <div><dt>Country</dt><dd>{request.country}</dd></div>
                    <div><dt>Channel</dt><dd>{request.contactChannel}</dd></div>
                    {request.contactChannel === "PHONE" && <div><dt>Phone</dt><dd>{request.phone}</dd></div>}
                    {request.contactChannel === "WHATSAPP" && <div><dt>WhatsApp</dt><dd>{request.whatsapp}</dd></div>}
                    <div><dt>Time zone</dt><dd>{request.timeZone}</dd></div>
                  </>
                )}
                <div><dt>Assigned to</dt><dd>{assignment?.contact?.name || "—"}</dd></div>
              </dl>

              <div className="admin-prayer-actions">
                <label htmlFor={`status-${request.id}`}>Change status</label>
                <select
                  id={`status-${request.id}`}
                  value={request.status}
                  onChange={(e) => onChangeStatus(e.target.value)}
                  disabled={saving}
                >
                  <option value="NEW">New</option>
                  <option value="PENDING_ASSIGNMENT">Pending assignment</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="CLOSED">Closed</option>
                </select>

                {!assignment && request.requestType === "PRAYER_AND_CONTACT" && (
                  <>
                    {assigning ? (
                      <div className="admin-assign-panel">
                        <label htmlFor={`assign-${request.id}`}>Select contact</label>
                        <select
                          id={`assign-${request.id}`}
                          onChange={(e) => onAssignContact(e.target.value)}
                          disabled={saving}
                        >
                          <option value="">Select a contact…</option>
                          {candidates.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.ministry})</option>
                          ))}
                        </select>
                        <button type="button" className="admin-button-ghost" onClick={onCancelAssign} disabled={saving}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" className="admin-button-secondary" onClick={onAssign} disabled={saving}>
                        Assign contact
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
