export const ASSIGNABLE_USER_ROLES = ["ADMIN", "TREASURER", "USHER"] as const;

export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];

export function isAssignableUserRole(role: unknown): role is AssignableUserRole {
  return typeof role === "string" && (ASSIGNABLE_USER_ROLES as readonly string[]).includes(role);
}

export function targetRolesIncludeSuperAdmin(targetRoles: readonly string[]) {
  return targetRoles.includes("SUPER_ADMIN");
}

export function shouldRejectSuperAdminRoleChange(targetRoles: readonly string[], requestedRole: unknown) {
  return requestedRole !== undefined && targetRolesIncludeSuperAdmin(targetRoles);
}

export function shouldRejectSelfDeactivation(actorId: string, targetId: string, active: unknown) {
  return active === false && actorId === targetId;
}
