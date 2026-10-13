import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {
  ASSIGNABLE_USER_ROLES,
  isAssignableUserRole,
  shouldRejectSelfDeactivation,
  shouldRejectSuperAdminRoleChange,
  targetRolesIncludeSuperAdmin,
} from "../src/lib/admin-user-actions";

const root = join(import.meta.dirname, "..");
const usersRoutePath = join(root, "src/app/api/admin/users/route.ts");
const userIdRoutePath = join(root, "src/app/api/admin/users/[id]/route.ts");
const usersRoute = readFileSync(usersRoutePath, "utf8");
const userIdRoute = readFileSync(userIdRoutePath, "utf8");

assert.deepEqual([...ASSIGNABLE_USER_ROLES], ["ADMIN", "TREASURER", "USHER"]);
assert.equal(isAssignableUserRole("ADMIN"), true);
assert.equal(isAssignableUserRole("SUPER_ADMIN"), false);
assert.equal(isAssignableUserRole("USHER"), true);
assert.equal(isAssignableUserRole(42), false);

assert.equal(targetRolesIncludeSuperAdmin(["ADMIN"]), false);
assert.equal(targetRolesIncludeSuperAdmin(["SUPER_ADMIN", "ADMIN"]), true);
assert.equal(shouldRejectSuperAdminRoleChange(["SUPER_ADMIN"], "ADMIN"), true);
assert.equal(shouldRejectSuperAdminRoleChange(["ADMIN"], "TREASURER"), false);
assert.equal(shouldRejectSuperAdminRoleChange(["ADMIN"], undefined), false);

assert.equal(shouldRejectSelfDeactivation("user-1", "user-1", false), true);
assert.equal(shouldRejectSelfDeactivation("user-1", "user-2", false), false);
assert.equal(shouldRejectSelfDeactivation("user-1", "user-1", true), false);

assert.match(usersRoute, /export async function POST/);
assert.match(usersRoute, /hasValidPublicOrigin/);
assert.match(usersRoute, /requireSuperAdmin/);
assert.match(usersRoute, /email_already_exists/);
assert.match(usersRoute, /signUpEmail/);
assert.match(usersRoute, /USER_CREATED/);
assert.match(usersRoute, /active: true/);
assert.match(usersRoute, /mustChangePassword: true/);
assert.ok(!usersRoute.includes('value="SUPER_ADMIN"'));

assert.match(userIdRoute, /shouldRejectSuperAdminRoleChange/);
assert.match(userIdRoute, /cannot_change_super_admin_role/);
assert.match(userIdRoute, /shouldRejectSelfDeactivation/);
assert.match(userIdRoute, /cannot_deactivate_self/);
assert.match(userIdRoute, /session\.deleteMany/);
assert.match(userIdRoute, /USER_UPDATED/);
assert.match(userIdRoute, /hasValidPublicOrigin/);
assert.match(userIdRoute, /requireSuperAdmin/);

console.log("verify-admin-users-api: all checks passed");
console.log("  - POST restored with origin, super-admin, duplicate email, Better Auth, role, audit, active, mustChangePassword");
console.log("  - SUPER_ADMIN role change rejected server-side");
console.log("  - Self-deactivation rejected server-side");
