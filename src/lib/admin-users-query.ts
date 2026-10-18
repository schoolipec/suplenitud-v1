// Server-only helper: imports the Prisma client. Never import this module from a Client Component.
import {ApplicationRole} from "@/generated/prisma/client";
import {prisma} from "@/lib/db/client";

export const ADMIN_USERS_PAGE_SIZE_WHITELIST = [10, 25, 50] as const;
export const ADMIN_USERS_SORT_WHITELIST = ["createdAt", "name", "email", "active"] as const;
export const ADMIN_USERS_DIRECTION_WHITELIST = ["asc", "desc"] as const;
export const ADMIN_USERS_ROLE_FILTER_WHITELIST = [
  ApplicationRole.SUPER_ADMIN,
  ApplicationRole.ADMIN,
  ApplicationRole.TREASURER,
  ApplicationRole.USHER,
] as const;

export type AdminUsersSortField = (typeof ADMIN_USERS_SORT_WHITELIST)[number];
export type AdminUsersSortDirection = (typeof ADMIN_USERS_DIRECTION_WHITELIST)[number];

export type AdminUsersQuery = {
  page: number;
  pageSize: number;
  query: string;
  role: ApplicationRole | null;
  status: "active" | "inactive" | null;
  sort: AdminUsersSortField;
  direction: AdminUsersSortDirection;
};

export type AdminUsersListItem = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  active: boolean;
  twoFactorEnabled: boolean;
  prayerTelegramAlertsEnabled: boolean;
  prayerEmailCopiesEnabled: boolean;
  roles: string[];
  lastActivityAt: string | null;
  pendingInvitation: {id: string; expiresAt: string; createdAt: string} | null;
};

export type AdminUsersPagination = {page: number; pageSize: number; totalItems: number; totalPages: number};
export type AdminUsersSort = {field: (typeof ADMIN_USERS_SORT_WHITELIST)[number]; direction: (typeof ADMIN_USERS_DIRECTION_WHITELIST)[number]};

export type AdminUsersResult = {
  users: AdminUsersListItem[];
  pagination: AdminUsersPagination;
  sort: AdminUsersSort;
};

export const DEFAULT_ADMIN_USERS_QUERY: AdminUsersQuery = {
  page: 1,
  pageSize: 25,
  query: "",
  role: null,
  status: null,
  sort: "createdAt",
  direction: "desc",
};

export function normalizeAdminUsersPage(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

export function normalizeAdminUsersPageSize(value: number): number {
  for (const allowed of ADMIN_USERS_PAGE_SIZE_WHITELIST) {
    if (value === allowed) return allowed;
  }
  return 25;
}

export function normalizeAdminUsersSort(value: string | null): (typeof ADMIN_USERS_SORT_WHITELIST)[number] {
  if (value && (ADMIN_USERS_SORT_WHITELIST as readonly string[]).includes(value)) {
    return value as (typeof ADMIN_USERS_SORT_WHITELIST)[number];
  }
  return "createdAt";
}

export function normalizeAdminUsersDirection(value: string | null): (typeof ADMIN_USERS_DIRECTION_WHITELIST)[number] {
  if (value && (ADMIN_USERS_DIRECTION_WHITELIST as readonly string[]).includes(value)) {
    return value as (typeof ADMIN_USERS_DIRECTION_WHITELIST)[number];
  }
  return "desc";
}

export function parseAdminUsersQuery(searchParams: URLSearchParams): AdminUsersQuery {
  const rawQuery = searchParams.get("query")?.trim() ?? "";
  const query = rawQuery.length > 120 ? rawQuery.slice(0, 120) : rawQuery;

  const roleParam = searchParams.get("role");
  const role =
    roleParam && roleParam !== "ALL" && (Object.values(ApplicationRole) as string[]).includes(roleParam)
      ? (roleParam as ApplicationRole)
      : null;

  const statusParam = searchParams.get("status");
  const status = statusParam === "active" || statusParam === "inactive" ? statusParam : null;

  return {
    page: normalizeAdminUsersPage(Number(searchParams.get("page"))),
    pageSize: normalizeAdminUsersPageSize(Number(searchParams.get("pageSize"))),
    query,
    role,
    status,
    sort: normalizeAdminUsersSort(searchParams.get("sort")),
    direction: normalizeAdminUsersDirection(searchParams.get("direction")),
  };
}

export async function queryAdminUsers(params: AdminUsersQuery): Promise<AdminUsersResult> {
  const where: Record<string, unknown> = {};
  if (params.query) {
    where.OR = [
      {name: {contains: params.query, mode: "insensitive"}},
      {email: {contains: params.query, mode: "insensitive"}},
    ];
  }
  if (params.status === "active") where.active = true;
  if (params.status === "inactive") where.active = false;
  if (params.role) where.roles = {some: {role: params.role}};

  const orderBy: Record<string, unknown> = {[params.sort]: params.direction};

  const totalItems = await prisma.user.count({where});
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize));
  // A requested page beyond the last valid page falls back to the last page.
  const page = Math.min(normalizeAdminUsersPage(params.page), totalPages);
  const skip = (page - 1) * params.pageSize;
  const take = params.pageSize;

  const rows = await prisma.user.findMany({
    where,
    orderBy,
    skip,
    take,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      active: true,
      twoFactorEnabled: true,
      prayerTelegramAlertsEnabled: true,
      prayerEmailCopiesEnabled: true,
      roles: {select: {role: true}},
      sessions: {select: {updatedAt: true}, orderBy: {updatedAt: "desc"}, take: 1},
      invitations: {
        where: {usedAt: null, revokedAt: null},
        orderBy: {createdAt: "desc"},
        take: 1,
        select: {id: true, expiresAt: true, createdAt: true},
      },
    },
  });

  const users: AdminUsersListItem[] = rows.map(({sessions, invitations, ...item}) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    roles: item.roles.map(({role}) => role),
    lastActivityAt: sessions[0]?.updatedAt.toISOString() ?? null,
    pendingInvitation: invitations[0]
      ? {
          id: invitations[0].id,
          expiresAt: invitations[0].expiresAt.toISOString(),
          createdAt: invitations[0].createdAt.toISOString(),
        }
      : null,
  }));

  return {
    users,
    pagination: {page, pageSize: params.pageSize, totalItems, totalPages},
    sort: {field: params.sort, direction: params.direction},
  };
}
