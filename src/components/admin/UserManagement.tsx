"use client";

import {FormEvent, useCallback, useEffect, useRef, useState} from "react";
import {
  IconBan,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconKey,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUserCheck,
  IconUserOff,
} from "@tabler/icons-react";
import {Modal} from "@/components/ui/Modal";
import {AdminPagination} from "@/components/admin/AdminPagination";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;
  twoFactorEnabled: boolean;
  roles: string[];
  lastActivityAt: string | null;
  pendingInvitation: {id: string; expiresAt: string; createdAt: string} | null;
  prayerTelegramAlertsEnabled: boolean;
  prayerEmailCopiesEnabled: boolean;
};

type SortField = "createdAt" | "name" | "email" | "active";
type SortDirection = "asc" | "desc";
type Pagination = {page: number; pageSize: number; totalItems: number; totalPages: number};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  TREASURER: "Treasurer",
  USHER: "Usher — no panel access",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {dateStyle: "medium"}).format(new Date(value));
}

const emailReasonLabels: Record<string, string> = {
  smtp_not_configured: "Email delivery is not configured on the server yet.",
  smtp_send_failed: "The mail server could not deliver the message this time.",
  template_disabled: "The invitation email is temporarily disabled.",
};

function invitationResultCopy(result: {email: string; emailSent: boolean; mode: "create" | "resend"}) {
  if (result.mode === "create") {
    return {
      title: "User created",
      body: result.emailSent
        ? `User created. An invitation was sent to ${result.email}. The link expires in 24 hours.`
        : "User created, but the invitation email was not delivered. The account remains pending and cannot sign in. Configure mail, then use Resend invitation.",
    };
  }
  return {
    title: "Invitation resend",
    body: result.emailSent
      ? `The invitation was resent to ${result.email}. The previous link no longer works. The new link expires in 24 hours.`
      : "A new invitation link was created, but the email was not delivered. The previous link no longer works. The account remains pending. Configure mail, then use Resend invitation.",
  };
}

async function requestUsers(params: {
  page: number;
  pageSize: number;
  query: string;
  role: string;
  status: string;
  sort: SortField;
  direction: SortDirection;
}): Promise<{users: ManagedUser[]; pagination: Pagination} | null> {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));
  if (params.query.trim()) search.set("query", params.query.trim());
  if (params.role !== "ALL") search.set("role", params.role);
  if (params.status !== "ALL") search.set("status", params.status);
  search.set("sort", params.sort);
  search.set("direction", params.direction);
  const response = await fetch(`/api/admin/users?${search.toString()}`, {cache: "no-store"});
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.users) || !data?.pagination) return null;
  return {users: data.users, pagination: data.pagination};
}

function SortHeader({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sort: {field: SortField; direction: SortDirection};
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sort.field === field;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" className={className} aria-sort={ariaSort}>
      <button type="button" className={`admin-sort-button${active ? " is-active" : ""}`} onClick={() => onSort(field)}>
        <span>{label}</span>
        <span aria-hidden className="admin-sort-indicator">{active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}</span>
        <span className="admin-sr-only">
          {active ? (sort.direction === "asc" ? "sorted ascending" : "sorted descending") : "not sorted"}
        </span>
      </button>
    </th>
  );
}

export function UserManagement({currentUserId}: {currentUserId?: string}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<{field: SortField; direction: SortDirection}>({field: "createdAt", direction: "desc"});
  const [pagination, setPagination] = useState<Pagination>({page: 1, pageSize: 25, totalItems: 0, totalPages: 1});
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<{id: string; action: "deactivate" | "activate" | "forcePassword" | "resend" | "revoke"} | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultModal, setResultModal] = useState<{email: string; emailSent: boolean; emailReason?: string | null; mode: "create" | "resend"} | null>(null);

  const requestIdRef = useRef(0);
  const paginationRef = useRef(pagination);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  const loadUsers = useCallback(async (targetPage = paginationRef.current.page): Promise<boolean> => {
    const requestId = ++requestIdRef.current;
    try {
      const result = await requestUsers({
        page: targetPage,
        pageSize,
        query: debouncedQuery,
        role: roleFilter,
        status: statusFilter,
        sort: sort.field,
        direction: sort.direction,
      });
      if (requestId !== requestIdRef.current) return false;
      if (!result) {
        setMessage("The user list could not be loaded.");
        return false;
      }
      setUsers(result.users);
      setPagination(result.pagination);
      setPage((current) => (current === result.pagination.page ? current : result.pagination.page));
      return true;
    } catch {
      if (requestId === requestIdRef.current) setMessage("The user list could not be loaded.");
      return false;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedQuery, pageSize, roleFilter, statusFilter, sort.field, sort.direction]);

  function reload(targetPage: number) {
    setLoading(true);
    void loadUsers(targetPage);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    // Refetch when the page changes; setState happens after the awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers(page);
  }, [page, loadUsers]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSort(field: SortField) {
    setLoading(true);
    setSort((current) =>
      current.field === field
        ? {field, direction: current.direction === "asc" ? "desc" : "asc"}
        : {field, direction: field === "createdAt" ? "desc" : "asc"},
    );
    setPage(1);
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        role: form.get("role"),
      }),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setMessage(
        data?.error === "email_already_exists"
          ? "That email is already registered."
          : "The user could not be created. Verify the information and try again.",
      );
      return;
    }
    const email = String(data.email ?? form.get("email") ?? "");
    formEl.reset();
    setCreating(false);
    // The result modal is shown first so a failed refresh never hides the outcome.
    setResultModal({email, emailSent: Boolean(data.emailSent), emailReason: data.emailReason, mode: "create"});
    setLoading(true);
    const refreshed = await loadUsers();
    if (!refreshed) {
      const now = new Date();
      const newUser: ManagedUser = {
        id: data.id ?? email,
        name: String(form.get("name") ?? ""),
        email,
        createdAt: now.toISOString(),
        active: true,
        twoFactorEnabled: false,
        roles: [String(form.get("role") ?? "ADMIN")],
        lastActivityAt: null,
        prayerTelegramAlertsEnabled: false,
        prayerEmailCopiesEnabled: false,
        pendingInvitation: {
          id: "optimistic",
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };
      setUsers((prev) => (prev.some((user) => user.email === email) ? prev : [newUser, ...prev]));
    }
  }

  async function runInvitationAction(id: string, action: "resend" | "revoke") {
    setSaving(true);
    const response = await fetch(`/api/admin/users/${id}/invitation`, {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({action}),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    setConfirming(null);
    if (!response.ok) {
      setMessage(
        data?.error === "invitation_already_completed"
          ? "This account already completed its invitation."
          : data?.error === "invitation_not_found"
            ? "There is no pending invitation for this account."
            : "The invitation action could not be completed. Try again.",
      );
      return;
    }
    if (action === "resend") {
      const target = users.find((user) => user.id === id);
      setResultModal({
        email: target?.email ?? data.email ?? "",
        emailSent: Boolean(data.emailSent),
        emailReason: data.emailReason,
        mode: "resend",
      });
      // Refresh best-effort; the resend already rotated the token server-side.
      setLoading(true);
      await loadUsers(pagination.page);
    } else {
      setMessage("Invitation revoked. The pending link no longer works.");
      setLoading(true);
      await loadUsers(pagination.page);
    }
  }

  async function onEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setMessage(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const target = users.find((user) => user.id === editingId);
    const body: Record<string, unknown> = {name: form.get("name")};
    if (form.get("role") && target && !target.roles.includes("SUPER_ADMIN")) {
      body.role = form.get("role");
    }
    const response = await fetch(`/api/admin/users/${editingId}`, {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!response.ok) {
      setMessage("The user could not be updated. Verify the information and try again.");
      return;
    }
    setEditingId(null);
    setMessage("User updated.");
    setLoading(true);
    await loadUsers(pagination.page);
  }

  async function runRowAction(id: string, action: "deactivate" | "activate" | "forcePassword") {
    setMessage(null);
    setSaving(true);
    const body =
      action === "forcePassword" ? {forcePasswordChange: true} : {active: action === "activate"};
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(body),
    });
    setSaving(false);
    setConfirming(null);
    if (!response.ok) {
      setMessage("The action could not be completed. Try again.");
      return;
    }
    setMessage(
      action === "forcePassword"
        ? "Password change required. The user must sign in again with a new password."
        : action === "deactivate"
          ? "User deactivated. They can no longer sign in."
          : "User reactivated.",
    );
    setLoading(true);
    await loadUsers(pagination.page);
  }

  return (
    <div className="admin-users">
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <h2>Users</h2>
            <p>Accounts and access roles for the platform.</p>
          </div>
          <div className="admin-section-actions">
            <button type="button" className="admin-button-secondary" onClick={() => reload(pagination.page)} disabled={loading}>
              <IconRefresh size={17} aria-hidden />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button type="button" className="admin-button-primary" onClick={() => { setCreating((open) => !open); setEditingId(null); }} aria-expanded={creating}>
              <IconPlus size={17} aria-hidden />
              Create user
            </button>
          </div>
        </div>

        {message ? <p className="admin-status-message" role="status">{message}</p> : null}

        {creating ? (
          <div className="admin-panel-box">
            <h3>Create user</h3>
            <p>No password is set here. The person receives a single-use invitation link (valid 24 hours) to choose their own password. The account cannot sign in until then.</p>
            <form onSubmit={onCreate} className="admin-auth-form admin-form-grid">
              <div>
                <label htmlFor="user-name">Name</label>
                <input id="user-name" name="name" required minLength={2} />
              </div>
              <div>
                <label htmlFor="user-email">Email</label>
                <input id="user-email" name="email" type="email" required />
              </div>
              <div>
                <label htmlFor="user-role">Role</label>
                <select id="user-role" name="role" defaultValue="ADMIN">
                  <option value="ADMIN">Admin</option>
                  <option value="TREASURER">Treasurer</option>
                  <option value="USHER">Usher — no panel access</option>
                </select>
              </div>
              <div className="admin-form-actions admin-form-actions-split">
                <button type="button" className="admin-button-danger" onClick={() => setCreating(false)}>Cancel</button>
                <button type="submit" disabled={saving}>{saving ? "Creating…" : "Create user"}</button>
              </div>
            </form>
          </div>
        ) : null}

        {editingId ? (
          <div className="admin-panel-box">
            <h3>Edit {editingId ? users.find((u) => u.id === editingId)?.name ?? "" : ""}</h3>
            <form onSubmit={onEdit} className="admin-auth-form admin-form-grid">
              <div>
                <label htmlFor="edit-user-name">Name</label>
                <input id="edit-user-name" name="name" defaultValue={editingId ? users.find((u) => u.id === editingId)?.name ?? "" : ""} required minLength={2} />
              </div>
              <div>
                <label htmlFor="edit-user-role">Role</label>
                {(users.find((u) => u.id === editingId)?.roles ?? []).includes("SUPER_ADMIN") ? (
                  <>
                    <input value="Super admin" readOnly aria-readonly="true" />
                    <p className="admin-field-note">The Super admin role cannot be changed from this screen.</p>
                  </>
                ) : (
                  <select id="edit-user-role" name="role" defaultValue={(users.find((u) => u.id === editingId)?.roles ?? [])[0] ?? "ADMIN"}>
                    <option value="ADMIN">Admin</option>
                    <option value="TREASURER">Treasurer</option>
                    <option value="USHER">Usher — no panel access</option>
                  </select>
                )}
              </div>
              {editingId && !(users.find((u) => u.id === editingId)?.roles ?? []).includes("SUPER_ADMIN") && (users.find((u) => u.id === editingId)?.roles ?? []).includes("ADMIN") ? (
                <div className="admin-alert-preferences">
                  <h4>Alertas de peticiones de oración</h4>
                  <p className="admin-field-note">El usuario activa sus propios avisos desde Settings. Aquí puede ajustarlos por él.</p>
                  <label className="admin-alert-toggle">
                    <input
                      type="checkbox"
                      name="prayerTelegramAlertsEnabled"
                      defaultChecked={users.find((u) => u.id === editingId)?.prayerTelegramAlertsEnabled ?? false}
                      disabled={saving}
                    />
                    <span>
                      <strong>Recibir peticiones de oración por Telegram</strong>
                      <small>Requiere un ID de Telegram configurado por el usuario.</small>
                    </span>
                  </label>
                  <label className="admin-alert-toggle">
                    <input
                      type="checkbox"
                      name="prayerEmailCopiesEnabled"
                      defaultChecked={users.find((u) => u.id === editingId)?.prayerEmailCopiesEnabled ?? false}
                      disabled={saving}
                    />
                    <span>
                      <strong>Recibir copias por correo de peticiones de oración</strong>
                      <small>Envía una copia al correo del usuario cuando llega una petición.</small>
                    </span>
                  </label>
                </div>
              ) : null}
              <div className="admin-form-actions">
                <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
                <button type="button" className="admin-button-ghost" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        {loading && users.length === 0 ? <p>Loading users…</p> : null}

        <div className="admin-toolbar">
          <div className="admin-toolbar-search">
            <IconSearch size={17} aria-hidden />
            <label htmlFor="user-search" className="admin-sr-only">Search users by name or email</label>
            <input
              id="user-search"
              type="search"
              placeholder="Search by name or email…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLoading(true);
                setPage(1);
              }}
            />
          </div>
          <div className="admin-toolbar-filters">
            <label htmlFor="user-role-filter" className="admin-sr-only">Filter by role</label>
            <select
              id="user-role-filter"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setLoading(true);
                setPage(1);
              }}
            >
              <option value="ALL">All roles</option>
              <option value="SUPER_ADMIN">Super admin</option>
              <option value="ADMIN">Admin</option>
              <option value="TREASURER">Treasurer</option>
              <option value="USHER">Usher</option>
            </select>
            <label htmlFor="user-status-filter" className="admin-sr-only">Filter by status</label>
            <select
              id="user-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setLoading(true);
                setPage(1);
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
            <label htmlFor="user-page-size">Rows</label>
            <select
              id="user-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setLoading(true);
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <SortHeader label="Name" field="name" sort={sort} onSort={handleSort} />
                <SortHeader label="Email" field="email" sort={sort} onSort={handleSort} />
                <th scope="col" className="admin-col-role">Role</th>
                <SortHeader label="Status" field="active" sort={sort} onSort={handleSort} />
                <th scope="col" className="admin-col-2fa">Two-factor</th>
                <SortHeader label="Created" field="createdAt" sort={sort} onSort={handleSort} />
                <th scope="col" className="admin-col-activity">Activity</th>
                <th scope="col"><span className="admin-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const expanded = expandedIds.has(user.id);
                const isSelf = user.id === currentUserId;
                return (
                  <UserRow
                    key={user.id}
                    user={user}
                    expanded={expanded}
                    isSelf={isSelf}
                    saving={saving}
                    confirming={confirming}
                    onToggleExpand={() => toggleExpand(user.id)}
                    onEdit={() => { setEditingId(user.id); setCreating(false); window.scrollTo({top: 0, behavior: "smooth"}); }}
                    onConfirm={(action) => setConfirming({id: user.id, action})}
                    onCancelConfirm={() => setConfirming(null)}
                    onRunAction={runRowAction}
                    onRunInvitationAction={runInvitationAction}
                  />
                );
              })}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="admin-empty">
                      <p>No users match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <AdminPagination
          pagination={pagination}
          onPageChange={(target) => {
            setLoading(true);
            setPage(target);
          }}
          disabled={loading}
        />
        </div>
      </section>

      {resultModal ? (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setResultModal(null);
          }}
          title={invitationResultCopy(resultModal).title}
          closeLabel="Close result"
          showCloseButton={false}
          dismissable={false}
        >
          <p className="modal-description">{invitationResultCopy(resultModal).body}</p>
          {!resultModal.emailSent && resultModal.emailReason && emailReasonLabels[resultModal.emailReason] ? (
            <p className="admin-field-note">{emailReasonLabels[resultModal.emailReason]}</p>
          ) : null}
          <div className="modal-actions">
            <button type="button" className="button" onClick={() => setResultModal(null)}>
              Close
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function UserRow({
  user,
  expanded,
  isSelf,
  saving,
  confirming,
  onToggleExpand,
  onEdit,
  onConfirm,
  onCancelConfirm,
  onRunAction,
  onRunInvitationAction,
}: {
  user: ManagedUser;
  expanded: boolean;
  isSelf: boolean;
  saving: boolean;
  confirming: {id: string; action: "deactivate" | "activate" | "forcePassword" | "resend" | "revoke"} | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onConfirm: (action: "deactivate" | "activate" | "forcePassword" | "resend" | "revoke") => void;
  onCancelConfirm: () => void;
  onRunAction: (id: string, action: "deactivate" | "activate" | "forcePassword") => void;
  onRunInvitationAction: (id: string, action: "resend" | "revoke") => void;
}) {
  const confirmForThisRow = confirming?.id === user.id ? confirming : null;
  return (
    <>
      <tr>
        <td data-label="Name">{user.name}</td>
        <td data-label="Email">{user.email}</td>
        <td data-label="Role" className="admin-col-role">
          <span className="admin-badge">{user.roles.map((role) => roleLabels[role] ?? role).join(", ")}</span>
        </td>
        <td data-label="Status">
          <span className={user.active ? "admin-badge admin-badge-success" : "admin-badge admin-badge-danger"}>
            {user.active ? "Active" : "Deactivated"}
          </span>
          {user.pendingInvitation ? (
            <span className="admin-badge admin-badge-muted" title={`Invitation sent ${formatDate(user.pendingInvitation.createdAt)}, expires ${formatDate(user.pendingInvitation.expiresAt)}`}>
              Invitation pending
            </span>
          ) : null}
        </td>
        <td data-label="Two-factor" className="admin-col-2fa">
          <span className={user.twoFactorEnabled ? "admin-badge admin-badge-success" : "admin-badge admin-badge-muted"}>
            {user.twoFactorEnabled ? "Active" : "Not configured"}
          </span>
        </td>
        <td data-label="Created">{formatDate(user.createdAt)}</td>
        <td data-label="Activity" className="admin-col-activity">
          <span className="admin-activity-cell">Last: {formatDate(user.lastActivityAt)}</span>
        </td>
        <td className="admin-col-actions">
          <div className="admin-row-actions">
            <button type="button" className="admin-icon-button" onClick={onEdit} aria-label={`Edit ${user.name}`}>
              <IconPencil size={17} aria-hidden />
            </button>
            {!isSelf ? (
              <>
                {confirmForThisRow?.action === "forcePassword" ? (
                  <span className="admin-confirm-inline">
                    <span>Require new password?</span>
                    <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={() => onRunAction(user.id, "forcePassword")} aria-label="Confirm password change required">
                      <IconCheck size={17} aria-hidden />
                    </button>
                    <button type="button" className="admin-icon-button" onClick={onCancelConfirm} aria-label="Cancel">
                      <IconBan size={17} aria-hidden />
                    </button>
                  </span>
                ) : (
                  <button type="button" className="admin-icon-button" onClick={() => onConfirm("forcePassword")} aria-label={`Require password change for ${user.name}`} title="Require password change">
                    <IconKey size={17} aria-hidden />
                  </button>
                )}
                {user.pendingInvitation && !confirmForThisRow ? (
                  <>
                    <button
                      type="button"
                      className="admin-button-secondary admin-button-small"
                      onClick={() => onConfirm("resend")}
                      disabled={saving}
                    >
                      Resend invitation
                    </button>
                    <button
                      type="button"
                      className="admin-button-ghost admin-button-small"
                      onClick={() => onConfirm("revoke")}
                      disabled={saving}
                    >
                      Revoke
                    </button>
                  </>
                ) : null}
                {confirmForThisRow?.action === "resend" ? (
                  <span className="admin-confirm-inline">
                    <span>Resend invitation? The previous link stops working.</span>
                    <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={() => onRunInvitationAction(user.id, "resend")} aria-label="Confirm resend invitation">
                      <IconCheck size={17} aria-hidden />
                    </button>
                    <button type="button" className="admin-icon-button" onClick={onCancelConfirm} aria-label="Cancel">
                      <IconBan size={17} aria-hidden />
                    </button>
                  </span>
                ) : null}
                {confirmForThisRow?.action === "revoke" ? (
                  <span className="admin-confirm-inline">
                    <span>Revoke invitation? The previous link stops working.</span>
                    <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={() => onRunInvitationAction(user.id, "revoke")} aria-label="Confirm revoke invitation">
                      <IconCheck size={17} aria-hidden />
                    </button>
                    <button type="button" className="admin-icon-button" onClick={onCancelConfirm} aria-label="Cancel">
                      <IconBan size={17} aria-hidden />
                    </button>
                  </span>
                ) : null}
                {confirmForThisRow?.action === "deactivate" ? (
                  <span className="admin-confirm-inline">
                    <span>Deactivate?</span>
                    <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={() => onRunAction(user.id, "deactivate")} aria-label="Confirm deactivation">
                      <IconCheck size={17} aria-hidden />
                    </button>
                    <button type="button" className="admin-icon-button" onClick={onCancelConfirm} aria-label="Cancel">
                      <IconBan size={17} aria-hidden />
                    </button>
                  </span>
                ) : null}
                {confirmForThisRow?.action === "activate" ? (
                  <span className="admin-confirm-inline">
                    <span>Reactivate?</span>
                    <button type="button" className="admin-icon-button admin-icon-confirm" disabled={saving} onClick={() => onRunAction(user.id, "activate")} aria-label="Confirm reactivation">
                      <IconCheck size={17} aria-hidden />
                    </button>
                    <button type="button" className="admin-icon-button" onClick={onCancelConfirm} aria-label="Cancel">
                      <IconBan size={17} aria-hidden />
                    </button>
                  </span>
                ) : null}
                {!confirmForThisRow ? (
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={() => onConfirm(user.active ? "deactivate" : "activate")}
                    aria-label={user.active ? `Deactivate ${user.name}` : `Reactivate ${user.name}`}
                    title={user.active ? "Deactivate" : "Reactivate"}
                  >
                    {user.active ? <IconUserOff size={17} aria-hidden /> : <IconUserCheck size={17} aria-hidden />}
                  </button>
                ) : null}
              </>
            ) : (
              <span className="admin-self-badge">You</span>
            )}
            <button type="button" className="admin-icon-button admin-expand-toggle" onClick={onToggleExpand} aria-expanded={expanded} aria-label={expanded ? `Hide details for ${user.name}` : `Show details for ${user.name}`}>
              {expanded ? <IconChevronUp size={17} aria-hidden /> : <IconChevronDown size={17} aria-hidden />}
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="admin-detail-row">
          <td colSpan={8}>
            <dl className="admin-user-detail">
              <div><dt>Created</dt><dd>{formatDate(user.createdAt)}</dd></div>
              <div><dt>Last activity</dt><dd>{formatDate(user.lastActivityAt)}</dd></div>
              <div><dt>Two-factor</dt><dd>{user.twoFactorEnabled ? "Active" : "Not configured"}</dd></div>
              <div><dt>Roles</dt><dd>{user.roles.map((role) => roleLabels[role] ?? role).join(", ")}</dd></div>
              <div><dt>Status</dt><dd>{user.active ? "Active" : "Deactivated"}</dd></div>
              <div><dt>Invitation</dt><dd>{user.pendingInvitation ? `Pending — expires ${formatDate(user.pendingInvitation.expiresAt)}` : "Completed or none"}</dd></div>
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}
