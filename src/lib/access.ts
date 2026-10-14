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

export function canViewDonations(roles: readonly ApplicationRole[]) {
  return (
    roles.includes(ApplicationRole.SUPER_ADMIN) ||
    roles.includes(ApplicationRole.ADMIN) ||
    roles.includes(ApplicationRole.TREASURER)
  );
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

export function canManageMinistryContacts(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN) || roles.includes(ApplicationRole.ADMIN);
}

export async function requireSuperAdmin(request: Request) {
  const session = await auth.api.getSession({headers: request.headers});
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {active: true, roles: {select: {role: true}}},
  });
  if (!user?.active) return null;
  return canManageUsers(user.roles.map(({role}) => role)) ? session.user : null;
}

export async function requireMinistryManager(request: Request) {
  const session = await auth.api.getSession({headers: request.headers});
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: {id: session.user.id},
    select: {active: true, roles: {select: {role: true}}},
  });
  if (!user?.active) return null;
  return canManageMinistryContacts(user.roles.map(({role}) => role)) ? session.user : null;
}
