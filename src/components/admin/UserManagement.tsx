"use client";

import {FormEvent, useCallback, useEffect, useRef, useState} from "react";
import {
  TextInput, Select, Button, Checkbox, Dialog, Stack, Group, Table, Alert, Badge
} from "@mantine/core";
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
import {AdminPagination} from "@/components/admin/AdminPagination";
import {useAdminShell} from "@/components/admin/AdminShellProvider";
import type {AdminUsersResult} from "@/lib/admin-users-query";

type ManagedUser = AdminUsersResult["users"][number];
type SortField = AdminUsersResult["sort"]["field"];
type SortDirection = AdminUsersResult["sort"]["direction"];
type Pagination = AdminUsersResult["pagination"];

function querySignature(parts: {
  page: number;
  pageSize: number;
  query: string;
  role: string;
  status: string;
  sort: SortField;
  direction: SortDirection;
}): string {
  return [parts.page, parts.pageSize, parts.query, parts.role, parts.status, parts.sort, parts.direction].join("|");
}

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
}: {
  label: string;
  field: SortField;
  sort: {field: SortField; direction: SortDirection};
  onSort: (field: SortField) => void;
}) {
  const active = sort.field === field;
  return (
    <Table.Th style={{cursor: "pointer"}}>
      <button type="button" style={{background: "none", border: "none", cursor: "pointer", fontWeight: active ? 600 : 400}} onClick={() => onSort(field)}>
        {label} {active ? (sort.direction === "asc" ? "▲" : "▼") : ""}
      </button>
    </Table.Th>
  );
}

export function UserManagement({currentUserId, initialData}: {currentUserId?: string; initialData: AdminUsersResult}) {
  const {locale, t} = useAdminShell();
  const l = locale === "es" ? {title: "Usuarios", subtitle: "Cuentas y roles de acceso de la plataforma.", refreshing: "Actualizando…", refresh: "Actualizar", create: "Crear usuario", search: "Buscar por nombre o correo…", allRoles: "Todos los roles", allStatuses: "Todos los estados", rows: "Filas", name: "Nombre", email: "Correo", role: "Rol", status: "Estado", twoFactor: "Dos factores", created: "Creado", activity: "Actividad", active: "Activo", inactive: "Desactivado", noUsers: "No hay usuarios que coincidan con los filtros actuales."} : {title: "Users", subtitle: "Accounts and access roles for the platform.", refreshing: "Refreshing…", refresh: "Refresh", create: "Create user", search: "Search by name or email…", allRoles: "All roles", allStatuses: "All statuses", rows: "Rows", name: "Name", email: "Email", role: "Role", status: "Status", twoFactor: "Two-factor", created: "Created", activity: "Activity", active: "Active", inactive: "Deactivated", noUsers: "No users match the current filters."};
  const [users, setUsers] = useState<ManagedUser[]>(initialData.users);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(initialData.pagination.page);
  const [pageSize, setPageSize] = useState(initialData.pagination.pageSize);
  const [sort, setSort] = useState<{field: SortField; direction: SortDirection}>({field: initialData.sort.field, direction: initialData.sort.direction});
  const [pagination, setPagination] = useState<Pagination>(initialData.pagination);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<{id: string; action: "deactivate" | "activate" | "forcePassword" | "resend" | "revoke"} | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultModal, setResultModal] = useState<{email: string; emailSent: boolean; emailReason?: string | null; mode: "create" | "resend"} | null>(null);

  const requestIdRef = useRef(0);
  const paginationRef = useRef(pagination);
  const lastAppliedSignatureRef = useRef(
    querySignature({
      page: initialData.pagination.page,
      pageSize: initialData.pagination.pageSize,
      query: "",
      role: "ALL",
      status: "ALL",
      sort: initialData.sort.field,
      direction: initialData.sort.direction,
    }),
  );

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
      lastAppliedSignatureRef.current = querySignature({
        page: result.pagination.page,
        pageSize,
        query: debouncedQuery,
        role: roleFilter,
        status: statusFilter,
        sort: sort.field,
        direction: sort.direction,
      });
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
    const signature = querySignature({
      page,
      pageSize,
      query: debouncedQuery,
      role: roleFilter,
      status: statusFilter,
      sort: sort.field,
      direction: sort.direction,
    });
    if (signature === lastAppliedSignatureRef.current) return;
    lastAppliedSignatureRef.current = signature;
    void loadUsers(page);
  }, [page, pageSize, debouncedQuery, roleFilter, statusFilter, sort.field, sort.direction, loadUsers]);

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

  const editingUser = users.find((u) => u.id === editingId);

  return (
    <Stack gap="lg">
      <div>
        <Group justify="space-between" wrap="wrap">
          <div>
            <h2 style={{margin: "0 0 0.5rem"}}>{l.title}</h2>
            <p style={{margin: 0, color: "var(--muted)", fontSize: "0.9rem"}}>{l.subtitle}</p>
          </div>
          <Group gap="xs">
            <Button
              variant="outline"
              size="sm"
              leftSection={<IconRefresh size={16} />}
              onClick={() => reload(pagination.page)}
              disabled={loading}
            >
              {loading ? l.refreshing : l.refresh}
            </Button>
            <Button
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => { setCreating((open) => !open); setEditingId(null); }}
            >
              {l.create}
            </Button>
          </Group>
        </Group>
      </div>

      {message && <Alert role="status">{message}</Alert>}

      {creating && (
        <Stack gap="md" p="md" style={{border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "var(--mist)"}}>
          <div>
            <h3 style={{margin: 0}}>Create user</h3>
            <p style={{margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "0.9rem"}}>No password is set here. The person receives a single-use invitation link (valid 24 hours) to choose their own password.</p>
          </div>
          <form onSubmit={onCreate}>
            <Stack gap="md">
              <TextInput label="Name" name="name" required minLength={2} />
              <TextInput label="Email" name="email" type="email" required />
              <Select label="Role" name="role" data={[
                {value: "ADMIN", label: "Admin"},
                {value: "TREASURER", label: "Treasurer"},
                {value: "USHER", label: "Usher — no panel access"},
              ]} defaultValue="ADMIN" />
              <Group justify="flex-end" gap="sm">
                <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create user"}</Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      )}

      {editingId && editingUser && (
        <Stack gap="md" p="md" style={{border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "var(--mist)"}}>
          <h3 style={{margin: 0}}>Edit {editingUser.name}</h3>
          <form onSubmit={onEdit}>
            <Stack gap="md">
              <TextInput label="Name" name="name" defaultValue={editingUser.name} required minLength={2} />
              {editingUser.roles.includes("SUPER_ADMIN") ? (
                <TextInput label="Role" value="Super admin" disabled />
              ) : (
                <Select label="Role" name="role" data={[
                  {value: "ADMIN", label: "Admin"},
                  {value: "TREASURER", label: "Treasurer"},
                  {value: "USHER", label: "Usher — no panel access"},
                ]} defaultValue={editingUser.roles[0] ?? "ADMIN"} />
              )}
              {editingUser.roles.includes("ADMIN") && !editingUser.roles.includes("SUPER_ADMIN") && (
                <Stack gap="sm" style={{backgroundColor: "var(--tint)", padding: "1rem", borderRadius: "4px"}}>
                  <h4 style={{margin: 0}}>Prayer request alerts</h4>
                  <Checkbox name="prayerTelegramAlertsEnabled" label="Receive prayer requests via Telegram" defaultChecked={editingUser.prayerTelegramAlertsEnabled} disabled={saving} />
                  <Checkbox name="prayerEmailCopiesEnabled" label="Receive prayer request copies via email" defaultChecked={editingUser.prayerEmailCopiesEnabled} disabled={saving} />
                </Stack>
              )}
              <Group justify="flex-end" gap="sm">
                <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      )}

      {loading && users.length === 0 ? <Alert>Loading users…</Alert> : null}

      <Group gap="md" wrap="wrap">
        <TextInput
          placeholder={l.search}
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLoading(true);
            setPage(1);
          }}
          style={{flex: 1, minWidth: "200px"}}
        />
        <Select
          placeholder={l.allRoles}
          data={[
            {value: "ALL", label: l.allRoles},
            {value: "SUPER_ADMIN", label: t.roles.SUPER_ADMIN},
            {value: "ADMIN", label: t.roles.ADMIN},
            {value: "TREASURER", label: t.roles.TREASURER},
            {value: "USHER", label: locale === "es" ? "Ujier" : "Usher"},
          ]}
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value || "ALL");
            setLoading(true);
            setPage(1);
          }}
          style={{minWidth: "150px"}}
        />
        <Select
          placeholder={l.allStatuses}
          data={[
            {value: "ALL", label: l.allStatuses},
            {value: "active", label: l.active},
            {value: "inactive", label: l.inactive},
          ]}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value || "ALL");
            setLoading(true);
            setPage(1);
          }}
          style={{minWidth: "150px"}}
        />
        <Select
          label={l.rows}
          data={PAGE_SIZE_OPTIONS.map((size) => ({value: String(size), label: String(size)}))}
          value={String(pageSize)}
          onChange={(value) => {
            setPageSize(Number(value));
            setLoading(true);
            setPage(1);
          }}
          style={{minWidth: "100px"}}
        />
      </Group>

      <div style={{overflowX: "auto"}}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <SortHeader label={l.name} field="name" sort={sort} onSort={handleSort} />
              <SortHeader label={l.email} field="email" sort={sort} onSort={handleSort} />
              <Table.Th>{l.role}</Table.Th>
              <SortHeader label={l.status} field="active" sort={sort} onSort={handleSort} />
              <Table.Th>{l.twoFactor}</Table.Th>
              <SortHeader label={l.created} field="createdAt" sort={sort} onSort={handleSort} />
              <Table.Th>{l.activity}</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => {
              const expanded = expandedIds.has(user.id);
              const isSelf = user.id === currentUserId;
              const confirmForThisRow = confirming?.id === user.id ? confirming : null;
              return (
                <Table.Tr key={user.id}>
                  <Table.Td>{user.name}</Table.Td>
                  <Table.Td>{user.email}</Table.Td>
                  <Table.Td><Badge>{user.roles.map((role) => roleLabels[role] ?? role).join(", ")}</Badge></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge color={user.active ? "green" : "red"}>{user.active ? "Active" : "Deactivated"}</Badge>
                      {user.pendingInvitation && <Badge color="gray">Invitation pending</Badge>}
                    </Group>
                  </Table.Td>
                  <Table.Td><Badge color={user.twoFactorEnabled ? "green" : "gray"}>{user.twoFactorEnabled ? "Active" : "Not configured"}</Badge></Table.Td>
                  <Table.Td>{formatDate(user.createdAt)}</Table.Td>
                  <Table.Td>{formatDate(user.lastActivityAt)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button variant="subtle" size="xs" leftSection={<IconPencil size={14} />} onClick={() => { setEditingId(user.id); setCreating(false); window.scrollTo({top: 0, behavior: "smooth"}); }}>Edit</Button>
                      {!isSelf && (
                        <>
                          {confirmForThisRow?.action === "forcePassword" && (
                            <Group gap="xs">
                              <span style={{fontSize: "0.85rem"}}>Require new password?</span>
                              <Button size="xs" leftSection={<IconCheck size={12} />} onClick={() => runRowAction(user.id, "forcePassword")} disabled={saving} />
                              <Button size="xs" variant="subtle" leftSection={<IconBan size={12} />} onClick={() => setConfirming(null)} />
                            </Group>
                          )}
                          {!confirmForThisRow && (
                            <Button variant="subtle" size="xs" leftSection={<IconKey size={14} />} onClick={() => setConfirming({id: user.id, action: "forcePassword"})} title="Require password change" />
                          )}
                          {user.pendingInvitation && !confirmForThisRow && (
                            <>
                              <Button size="xs" variant="outline" onClick={() => setConfirming({id: user.id, action: "resend"})} disabled={saving}>Resend</Button>
                              <Button size="xs" variant="subtle" onClick={() => setConfirming({id: user.id, action: "revoke"})} disabled={saving}>Revoke</Button>
                            </>
                          )}
                          {confirmForThisRow?.action === "resend" && (
                            <Group gap="xs">
                              <span style={{fontSize: "0.85rem"}}>Resend invitation?</span>
                              <Button size="xs" leftSection={<IconCheck size={12} />} onClick={() => runInvitationAction(user.id, "resend")} disabled={saving} />
                              <Button size="xs" variant="subtle" leftSection={<IconBan size={12} />} onClick={() => setConfirming(null)} />
                            </Group>
                          )}
                          {confirmForThisRow?.action === "revoke" && (
                            <Group gap="xs">
                              <span style={{fontSize: "0.85rem"}}>Revoke invitation?</span>
                              <Button size="xs" leftSection={<IconCheck size={12} />} onClick={() => runInvitationAction(user.id, "revoke")} disabled={saving} />
                              <Button size="xs" variant="subtle" leftSection={<IconBan size={12} />} onClick={() => setConfirming(null)} />
                            </Group>
                          )}
                          {confirmForThisRow?.action === "deactivate" && (
                            <Group gap="xs">
                              <span style={{fontSize: "0.85rem"}}>Deactivate?</span>
                              <Button size="xs" leftSection={<IconCheck size={12} />} onClick={() => runRowAction(user.id, "deactivate")} disabled={saving} />
                              <Button size="xs" variant="subtle" leftSection={<IconBan size={12} />} onClick={() => setConfirming(null)} />
                            </Group>
                          )}
                          {confirmForThisRow?.action === "activate" && (
                            <Group gap="xs">
                              <span style={{fontSize: "0.85rem"}}>Reactivate?</span>
                              <Button size="xs" leftSection={<IconCheck size={12} />} onClick={() => runRowAction(user.id, "activate")} disabled={saving} />
                              <Button size="xs" variant="subtle" leftSection={<IconBan size={12} />} onClick={() => setConfirming(null)} />
                            </Group>
                          )}
                          {!confirmForThisRow && (
                            <Button variant="subtle" size="xs" leftSection={user.active ? <IconUserOff size={14} /> : <IconUserCheck size={14} />} onClick={() => setConfirming({id: user.id, action: user.active ? "deactivate" : "activate"})} />
                          )}
                        </>
                      )}
                      {isSelf && <span style={{fontSize: "0.85rem", color: "var(--muted)"}}>You</span>}
                      <Button variant="subtle" size="xs" leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />} onClick={() => toggleExpand(user.id)} />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {users.length === 0 && <Table.Tr><Table.Td colSpan={8}><Alert color="gray">{l.noUsers}</Alert></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </div>

      <AdminPagination
        pagination={pagination}
        onPageChange={(target) => {
          setLoading(true);
          setPage(target);
        }}
        disabled={loading}
      />

      <Dialog opened={resultModal !== null} onClose={() => setResultModal(null)} title={resultModal ? invitationResultCopy(resultModal).title : ""}>
        {resultModal && (
          <Stack gap="md">
            <p>{invitationResultCopy(resultModal).body}</p>
            {!resultModal.emailSent && resultModal.emailReason && emailReasonLabels[resultModal.emailReason] && (
              <Alert color="yellow">{emailReasonLabels[resultModal.emailReason]}</Alert>
            )}
            <Button onClick={() => setResultModal(null)}>Close</Button>
          </Stack>
        )}
      </Dialog>
    </Stack>
  );
}
