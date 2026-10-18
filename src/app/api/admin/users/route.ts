import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/db/client";
import {requireSuperAdmin} from "@/lib/access";
import {hasValidPublicOrigin} from "@/lib/request-origin";
import {ApplicationRole} from "@/generated/prisma/client";
import {ASSIGNABLE_USER_ROLES} from "@/lib/admin-user-actions";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/lib/invitations";
import {invitationMail} from "@/lib/mail/templates";
import {sendInvitationMail} from "@/lib/mail/send";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const assignableRoles = [ApplicationRole.ADMIN, ApplicationRole.TREASURER, ApplicationRole.USHER] as const;

function inviteBaseUrl(): string {
  const base = process.env.INVITE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "";
  return base.replace(/\/+$/, "");
}

const PAGE_SIZE_WHITELIST = [10, 25, 50] as const;
const SORT_WHITELIST = ["createdAt", "name", "email", "active"] as const;
const DIRECTION_WHITELIST = ["asc", "desc"] as const;
type SortField = (typeof SORT_WHITELIST)[number];
type SortDirection = (typeof DIRECTION_WHITELIST)[number];

function clampPage(n: number) {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function normalizePageSize(n: number) {
  for (const v of PAGE_SIZE_WHITELIST) {
    if (n === v) return v;
  }
  return 25;
}

function normalizeSort(field: string | null): SortField {
  if (field && (SORT_WHITELIST as readonly string[]).includes(field)) {
    return field as SortField;
  }
  return "createdAt";
}

function normalizeDirection(dir: string | null): SortDirection {
  if (dir === "asc" || dir === "desc") return dir;
  return "desc";
}

export async function GET(request: Request) {
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("pageSize");
  const queryParam = url.searchParams.get("query");
  const roleParam = url.searchParams.get("role");
  const statusParam = url.searchParams.get("status");
  const sortParam = url.searchParams.get("sort");
  const directionParam = url.searchParams.get("direction");

  const page = clampPage(Number(pageParam));
  const pageSize = normalizePageSize(Number(pageSizeParam));
  const sort = normalizeSort(sortParam);
  const direction = normalizeDirection(directionParam);

  const query = queryParam?.trim() ?? "";
  const safeQuery = query.length > 120 ? query.slice(0, 120) : query;

  let roleFilter: ApplicationRole | null = null;
  if (roleParam && roleParam !== "ALL") {
    if ((assignableRoles as readonly string[]).includes(roleParam) || roleParam === ApplicationRole.SUPER_ADMIN) {
      if (roleParam === ApplicationRole.SUPER_ADMIN) {
        roleFilter = ApplicationRole.SUPER_ADMIN;
      } else {
        roleFilter = roleParam as ApplicationRole;
      }
    }
  }

  let statusFilter: "active" | "inactive" | null = null;
  if (statusParam === "active" || statusParam === "inactive") {
    statusFilter = statusParam;
  }

  const where: Record<string, unknown> = {};
  if (safeQuery) {
    where.OR = [
      {name: {contains: safeQuery, mode: "insensitive"}},
      {email: {contains: safeQuery, mode: "insensitive"}},
    ];
  }
  if (statusFilter === "active") where.active = true;
  if (statusFilter === "inactive") where.active = false;
  if (roleFilter) {
    where.roles = {some: {role: roleFilter}};
  }

  const orderBy: Record<string, unknown> = {[sort]: direction};

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [totalItems, users] = await Promise.all([
    prisma.user.count({where}),
    prisma.user.findMany({
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
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return NextResponse.json({
    users: users.map(({sessions, invitations, ...user}) => ({
      ...user,
      roles: user.roles.map(({role}) => role),
      lastActivityAt: sessions[0]?.updatedAt ?? null,
      pendingInvitation: invitations[0] ?? null,
    })),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
    sort: {field: sort, direction},
  });
}