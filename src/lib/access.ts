import {ApplicationRole} from "@/generated/prisma/client";

export const ADMIN_PANEL_ROLES = [ApplicationRole.SUPER_ADMIN, ApplicationRole.ADMIN, ApplicationRole.TREASURER] as const;

export function canAccessAdmin(roles: readonly ApplicationRole[]) {
  return roles.some((role) => ADMIN_PANEL_ROLES.includes(role as (typeof ADMIN_PANEL_ROLES)[number]));
}

export function canManageUsers(roles: readonly ApplicationRole[]) {
  return roles.includes(ApplicationRole.SUPER_ADMIN);
}
