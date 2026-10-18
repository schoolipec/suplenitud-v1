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
const ROLE_FILTER_WHITELIST = [
  ApplicationRole.SUPER_ADMIN,
  ApplicationRole.ADMIN,
  ApplicationRole.TREASURER,
  ApplicationRole.USHER,
] as const;
type SortField = (typeof SORT_WHITELIST)[number];
type SortDirection = (typeof DIRECTION_WHITELIST)[number];

function normalizePage(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function normalizePageSize(n: number): number {
  for (const value of PAGE_SIZE_WHITELIST) {
    if (n === value) return value;
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
  if (dir && (DIRECTION_WHITELIST as readonly string[]).includes(dir)) {
    return dir as SortDirection;
  }
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

  const pageSize = normalizePageSize(Number(pageSizeParam));
  const sort = normalizeSort(sortParam);
  const direction = normalizeDirection(directionParam);

  const query = queryParam?.trim() ?? "";
  const safeQuery = query.length > 120 ? query.slice(0, 120) : query;

  let roleFilter: ApplicationRole | null = null;
  if (roleParam && roleParam !== "ALL" && (ROLE_FILTER_WHITELIST as readonly string[]).includes(roleParam)) {
    roleFilter = roleParam as ApplicationRole;
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
  if (roleFilter) where.roles = {some: {role: roleFilter}};

  const orderBy: Record<string, unknown> = {[sort]: direction};

  const totalItems = await prisma.user.count({where});
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  // A requested page beyond the last valid page falls back to the last page.
  const page = Math.min(normalizePage(Number(pageParam)), totalPages);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const users = await prisma.user.findMany({
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

  return NextResponse.json({
    users: users.map(({sessions, invitations, ...user}) => ({
      ...user,
      roles: user.roles.map(({role}) => role),
      lastActivityAt: sessions[0]?.updatedAt ?? null,
      pendingInvitation: invitations[0] ?? null,
    })),
    pagination: {page, pageSize, totalItems, totalPages},
    sort: {field: sort, direction},
  });
}

export async function POST(request: Request) {
  if (!hasValidPublicOrigin(request)) {
    return NextResponse.json({error: "invalid_origin"}, {status: 403});
  }
  const actor = await requireSuperAdmin(request);
  if (!actor) return NextResponse.json({error: "forbidden"}, {status: 403});

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error: "invalid_request"}, {status: 400});
  const {name, email, role} = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    typeof email !== "string" ||
    !emailPattern.test(email) ||
    typeof role !== "string" ||
    !assignableRoles.includes(role as (typeof assignableRoles)[number])
  ) {
    return NextResponse.json({error: "invalid_user_data"}, {status: 400});
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await prisma.user.findUnique({where: {email: normalizedEmail}})) {
    return NextResponse.json({error: "email_already_exists"}, {status: 409});
  }

  // No password is ever set here: the account is created without credentials
  // and stays unable to sign in until the invitation is accepted.
  const userId = randomUUID();
  const token = generateInvitationToken();
  const created = await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        emailVerified: false,
        active: true,
        mustChangePassword: true,
      },
    }),
    prisma.userRole.create({data: {userId, role: role as ApplicationRole}}),
    prisma.userInvitation.create({
      data: {
        userId,
        email: normalizedEmail,
        tokenHash: hashInvitationToken(token),
        expiresAt: invitationExpiresAt(),
        createdById: actor.id,
      },
    }),
  ]);
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "USER_CREATED",
      resource: "user",
      resourceId: userId,
      metadata: {role, active: true, assignableRoles: [...ASSIGNABLE_USER_ROLES]},
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "INVITATION_CREATED",
      resource: "user_invitation",
      resourceId: created[2].id,
      metadata: {userId, email: normalizedEmail},
    },
  });

  const acceptUrl = `${inviteBaseUrl()}/invite/${token}`;
  const mailResult = await sendInvitationMail(
    invitationMail({to: normalizedEmail, name: name.trim(), acceptUrl}),
  );

  return NextResponse.json(
    {id: userId, email: normalizedEmail, emailSent: mailResult.sent, emailReason: mailResult.reason},
    {status: 201},
  );
}
