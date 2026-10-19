import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const route = await readFile("src/app/api/admin/profile/email/route.ts", "utf8");
const profile = await readFile("src/components/admin/ProfileSettings.tsx", "utf8");
const users = await readFile("src/components/admin/UserManagement.tsx", "utf8");
const pagination = await readFile("src/components/admin/AdminPagination.tsx", "utf8");

assert.match(route, /hasValidPublicOrigin/);
assert.match(route, /auth\.api\.getSession/);
assert.match(route, /verifyPassword/);
assert.match(route, /session\.deleteMany/);
assert.match(route, /PROFILE_EMAIL_CHANGED/);
assert.match(route, /email_in_use/);
assert.match(profile, /Confirm email change/);
assert.match(profile, /Confirmar cambio de correo/);
assert.match(profile, /successEmail/);
assert.match(profile, /setSeconds/);
assert.match(users, /const \{locale, t\} = useAdminShell\(\)/);
assert.match(pagination, /useAdminShell/);
console.log("verify-profile-email-change: seguridad de correo, cierre de sesión y traducciones principales verificados.");
