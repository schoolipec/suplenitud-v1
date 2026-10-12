import {ApplicationRole} from "@/generated/prisma/client";
import {auth} from "@/lib/auth";
import {prisma} from "@/lib/db/client";

export const ADMIN_PANEL_ROLES = [ApplicationRole.SUPER_ADMIN, ApplicationRole.ADMIN, ApplicationRole.TREASURER] as const;

export function canAccessAdmin(roles: readonly ApplicationRole[]) {
  return roles.some((role) => ADMIN_PANEL_ROLES.includes(role as (typeof ADMIN_PANEL_ROLES)[number]));
}

export function canManageUsers(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN);
}

export function canManageDonations(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN) || roles.includes(ApplicationRole.TREASURER);
}

export function canViewContent(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN) || roles.includes(ApplicationRole.ADMIN);
}

export function canViewPrayerRequests(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN) || roles.includes(ApplicationRole.ADMIN);
}

export function canViewUshers(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN) || roles.includes(ApplicationRole.ADMIN);
}

export function canViewVisits(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN) || roles.includes(ApplicationRole.ADMIN);
}

export async function requireSuperAdmin(request: Request) {
  const session = await auth.api.getSession({headers: request.headers});
  if (!session?.user) return null;
  const assignments = await prisma.userRole.findMany({where: {userId: session.user.id}, select: {role: true}});
  return canManageUsers(assignments.map(({role}) => role)) ? session.user : null;
}
