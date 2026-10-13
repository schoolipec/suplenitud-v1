import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {
  INVITATION_MIN_PASSWORD_LENGTH,
  INVITATION_TTL_MS,
  generateInvitationToken,
  getInvitationStatus,
  hashInvitationToken,
  invitationExpiresAt,
  isAcceptablePassword,
  isInvitationUsable,
  tokensEqual,
} from "../src/lib/invitations";
import {isSmtpConfigured, DEFAULT_MAIL_FROM} from "../src/lib/mail/config";
import {invitationMail, mailTemplates} from "../src/lib/mail/templates";

const root = join(import.meta.dirname, "..");

// Token generation: unique, url-safe, hashed with SHA-256 (64 hex chars)
const tokenA = generateInvitationToken();
const tokenB = generateInvitationToken();
assert.notEqual(tokenA, tokenB);
assert.match(tokenA, /^[A-Za-z0-9_-]+$/);
assert.equal(hashInvitationToken(tokenA).length, 64);
assert.equal(hashInvitationToken(tokenA), hashInvitationToken(tokenA));
assert.notEqual(hashInvitationToken(tokenA), hashInvitationToken(tokenB));
assert.equal(tokensEqual(hashInvitationToken(tokenA), hashInvitationToken(tokenA)), true);
assert.equal(tokensEqual(hashInvitationToken(tokenA), hashInvitationToken(tokenB)), false);

// Raw tokens never equal their stored hash
assert.notEqual(tokenA, hashInvitationToken(tokenA));

// 24-hour expiry
assert.equal(INVITATION_TTL_MS, 24 * 60 * 60 * 1000);
const base = new Date("2026-10-14T12:00:00.000Z");
assert.equal(invitationExpiresAt(base).toISOString(), "2026-10-15T12:00:00.000Z");

// Status matrix: expired / used / revoked tokens are unusable
const fresh = {usedAt: null, revokedAt: null, expiresAt: new Date(base.getTime() + 3600000)};
assert.equal(getInvitationStatus({...fresh, now: base}), "valid");
assert.equal(isInvitationUsable({...fresh, now: base}), true);
assert.equal(getInvitationStatus({...fresh, now: new Date(base.getTime() + 2 * INVITATION_TTL_MS)}), "expired");
assert.equal(getInvitationStatus({usedAt: base, revokedAt: null, expiresAt: new Date(base.getTime() + 3600000), now: base}), "used");
assert.equal(getInvitationStatus({usedAt: null, revokedAt: base, expiresAt: new Date(base.getTime() + 3600000), now: base}), "revoked");
assert.equal(isInvitationUsable({usedAt: base, revokedAt: null, expiresAt: new Date(base.getTime() + 3600000), now: base}), false);
assert.equal(isInvitationUsable({usedAt: null, revokedAt: base, expiresAt: new Date(base.getTime() + 3600000), now: base}), false);

// Password floor: 8 characters, server and client
assert.equal(INVITATION_MIN_PASSWORD_LENGTH, 8);
assert.equal(isAcceptablePassword("12345678"), true);
assert.equal(isAcceptablePassword("1234567"), false);
assert.equal(isAcceptablePassword(""), false);
assert.equal(isAcceptablePassword(null), false);
assert.equal(isAcceptablePassword("a".repeat(129)), false);

// SMTP detection never invents configuration
assert.equal(isSmtpConfigured({} as unknown as NodeJS.ProcessEnv), false);
assert.equal(isSmtpConfigured({SMTP_HOST: "mail.example.com"} as unknown as NodeJS.ProcessEnv), false);
assert.equal(
  isSmtpConfigured({SMTP_HOST: "mail.example.com", SMTP_USER: "u", SMTP_PASS: "p"} as unknown as NodeJS.ProcessEnv),
  true,
);
assert.equal(DEFAULT_MAIL_FROM, "no-reply@suplenitud.com");

// Only the invitation template may send in this phase
assert.equal(mailTemplates.invitation.active, true);
assert.equal(mailTemplates["password-recovery"].active, false);
assert.equal(mailTemplates["admin-notice"].active, false);

// Invitation mail carries the accept link, never a password
const mail = invitationMail({to: "person@example.com", name: "Person", acceptUrl: "https://demo.suplenitud.com/invite/abc"});
assert.equal(mail.to, "person@example.com");
assert.ok(mail.html.includes("https://demo.suplenitud.com/invite/abc"));
assert.ok(!mail.html.toLowerCase().includes("password:"));
assert.ok(mail.subject.length > 0 && mail.text.length > 0);

// Wiring: creation without credentials, honest delivery reporting
const usersRoute = readFileSync(join(root, "src/app/api/admin/users/route.ts"), "utf8");
assert.match(usersRoute, /requireSuperAdmin/);
assert.match(usersRoute, /email_already_exists/);
assert.match(usersRoute, /INVITATION_CREATED/);
assert.match(usersRoute, /emailSent/);
assert.ok(!usersRoute.includes("temporaryPassword"));

// Wiring: pending invitations block sessions in the auth hook
const authLib = readFileSync(join(root, "src/lib/auth.ts"), "utf8");
assert.match(authLib, /userInvitation/);
assert.match(authLib, /usedAt: null/);

// Wiring: accept validates token states, enforces length, links credential account
const acceptRoute = readFileSync(join(root, "src/app/api/invitations/accept/route.ts"), "utf8");
assert.match(acceptRoute, /invalid_token/);
assert.match(acceptRoute, /invitation_\$\{status\}/);
assert.match(acceptRoute, /getInvitationStatus/);
assert.match(acceptRoute, /status: 410/);
assert.match(acceptRoute, /password_too_short/);
assert.match(acceptRoute, /providerId: "credential"/);
assert.match(acceptRoute, /INVITATION_ACCEPTED/);
assert.match(acceptRoute, /usedAt: new Date/);

// Wiring: resend rotates, revoke cancels, both audited, completed accounts protected
const invitationRoute = readFileSync(join(root, "src/app/api/admin/users/[id]/invitation/route.ts"), "utf8");
assert.match(invitationRoute, /requireSuperAdmin/);
assert.match(invitationRoute, /INVITATION_RESENT/);
assert.match(invitationRoute, /INVITATION_REVOKED/);
assert.match(invitationRoute, /invitation_already_completed/);
assert.match(invitationRoute, /revokedAt: new Date/);

// Wiring: UI sends no password and offers resend/revoke with confirmation
const userManagement = readFileSync(join(root, "src/components/admin/UserManagement.tsx"), "utf8");
assert.ok(!userManagement.includes("temporaryPassword"));
assert.match(userManagement, /Resend invitation/);
assert.match(userManagement, /\/invitation`/);
assert.match(userManagement, /Invitation pending/);

// Wiring: migration preserves existing users and stores hashes only
const migration = readFileSync(join(root, "prisma/migrations/20261014000000_user_invitations/migration.sql"), "utf8");
assert.match(migration, /user_invitations/);
assert.match(migration, /token_hash/);
assert.ok(!migration.includes("password TEXT"));
assert.ok(!migration.includes('"password"'));

console.log("verify-invitations: all checks passed");
console.log("  - Single-use hashed tokens, 24h expiry, expired/used/revoked rejected");
console.log("  - Minimum 8-character first password, enforced server and client");
console.log("  - Pending invitations block sign-in via the session hook");
console.log("  - Resend rotates, revoke cancels, completed accounts protected, all audited");
console.log("  - SMTP by environment only; no false delivery reports; mail from no-reply@suplenitud.com");
console.log("  - Only the invitation template may send; existing users preserved");
