import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import type {ApplicationRole} from "../src/generated/prisma/client";
import {selectPrayerAlertRecipients, isValidTelegramChatId} from "../src/lib/prayer-recipients";
import {getAdminUrl} from "../src/lib/admin-url";

const root = join(import.meta.dirname, "..");
const source = (path: string) => readFileSync(join(root, path), "utf8");

// Pure eligibility rules
assert.equal(isValidTelegramChatId(""), false);
assert.equal(isValidTelegramChatId(null), false);
assert.equal(isValidTelegramChatId("   "), false);
assert.equal(isValidTelegramChatId("abc"), false);
assert.equal(isValidTelegramChatId("123456"), true);
assert.equal(isValidTelegramChatId("-1001234567890"), true);
assert.equal(isValidTelegramChatId("1234567890123456789012345"), false);

type UserRow = {id: string; name: string; email: string; active: boolean; telegramChatId: string | null; prayerTelegramAlertsEnabled: boolean; prayerEmailCopiesEnabled: boolean; roles: {role: ApplicationRole}[]};

const adminRow: UserRow = {id: "u1", name: "Admin", email: "admin@example.com", active: true, telegramChatId: "111", prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "ADMIN"}]};
const superRow: UserRow = {id: "u2", name: "Super", email: "super@example.com", active: true, telegramChatId: "222", prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "SUPER_ADMIN"}]};
const treasurerRow: UserRow = {id: "u3", name: "Treas", email: "treas@example.com", active: true, telegramChatId: "333", prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "TREASURER"}]};
const inactiveRow: UserRow = {id: "u4", name: "Old", email: "old@example.com", active: false, telegramChatId: "444", prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "ADMIN"}]};
const noTelegramRow: UserRow = {id: "u5", name: "NoTG", email: "notg@example.com", active: true, telegramChatId: null, prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "ADMIN"}]};
const badTelegramRow: UserRow = {id: "u6", name: "BadTG", email: "badtg@example.com", active: true, telegramChatId: "abc", prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "ADMIN"}]};
const duplicateRow: UserRow = {id: "u7", name: "Dup", email: "dup@example.com", active: true, telegramChatId: "111", prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "ADMIN"}]};
const offRow: UserRow = {id: "u8", name: "Off", email: "off@example.com", active: true, telegramChatId: "555", prayerTelegramAlertsEnabled: false, prayerEmailCopiesEnabled: false, roles: [{role: "ADMIN"}]};
const badEmailRow: UserRow = {id: "u9", name: "BadEmail", email: "not-an-email", active: true, telegramChatId: "666", prayerTelegramAlertsEnabled: true, prayerEmailCopiesEnabled: true, roles: [{role: "ADMIN"}]};

function runRecipients(users: UserRow[]) {
  return selectPrayerAlertRecipients(users as Parameters<typeof selectPrayerAlertRecipients>[0]);
}

// No preferences: empty payload, no failure
const none = runRecipients([{...adminRow, prayerTelegramAlertsEnabled: false, prayerEmailCopiesEnabled: false}]);
assert.deepEqual(none.telegramChatIds, []);
assert.deepEqual(none.emailCopyRecipients, []);

// SUPER_ADMIN + ADMIN enabled
const both = runRecipients([adminRow, superRow]);
assert.deepEqual(both.telegramChatIds.sort(), ["111", "222"]);
assert.deepEqual(both.emailCopyRecipients.sort(), ["admin@example.com", "super@example.com"]);

// Duplicates removed (same chat id)
const dup = runRecipients([adminRow, duplicateRow]);
assert.deepEqual(dup.telegramChatIds, ["111"]);
assert.equal(dup.telegramChatIds.length, 1);

// Inactive, TREASURER, no/invalid telegram excluded from telegram;
// emails go to all enabled users with valid email regardless of telegram config
const filtered = runRecipients([adminRow, treasurerRow, inactiveRow, noTelegramRow, badTelegramRow, offRow, badEmailRow]);
assert.deepEqual(filtered.telegramChatIds.sort(), ["111", "666"]);
assert.deepEqual(filtered.emailCopyRecipients.sort(), ["admin@example.com", "badtg@example.com", "notg@example.com"]);

// Only telegram enabled -> no emails
const tgOnly = runRecipients([{...adminRow, prayerEmailCopiesEnabled: false}]);
assert.deepEqual(tgOnly.telegramChatIds, ["111"]);
assert.deepEqual(tgOnly.emailCopyRecipients, []);

// Only email enabled -> no telegram
const emailOnly = runRecipients([{...adminRow, prayerTelegramAlertsEnabled: false}]);
assert.deepEqual(emailOnly.telegramChatIds, []);
assert.deepEqual(emailOnly.emailCopyRecipients, ["admin@example.com"]);

// adminUrl from config only, never request headers
const savedEnv = process.env;
process.env = {...savedEnv};
delete process.env.APP_ADMIN_URL;
const urlNone = getAdminUrl();
process.env.APP_ADMIN_URL = "https://suplenitud.com";
const urlProd = getAdminUrl();
process.env = savedEnv;
assert.equal(urlNone, null);
assert.equal(urlProd, "https://suplenitud.com");

// Payload keeps legacy telegramChatId = first id, plus arrays
assert.equal(both.telegramChatIds[0], "111");
assert.ok(both.telegramChatIds.length >= 1);

// Wiring: public prayer route builds multi-recipient payload from server recipients
const prayerRoute = source("src/app/api/prayer/route.ts");
assert.match(prayerRoute, /selectPrayerAlertRecipients/);
assert.match(prayerRoute, /telegramChatIds: recipients\.telegramChatIds/);
assert.match(prayerRoute, /telegramChatIds/);
assert.match(prayerRoute, /emailCopyRecipients: recipients\.emailCopyRecipients/);
assert.match(prayerRoute, /adminUrl: getAdminUrl\(\)/);
assert.doesNotMatch(prayerRoute, /visitorEmail|visitorPhone|visitorContact/i);

// Panel wiring: settings expose the two switches; users manager edits ADMIN preferences
const profilePage = source("src/app/admin/configs/page.tsx");
assert.match(profilePage, /prayerTelegramAlertsEnabled: user\.prayerTelegramAlertsEnabled/);
assert.match(profilePage, /prayerEmailCopiesEnabled: user\.prayerEmailCopiesEnabled/);
const profileApi = source("src/app/api/admin/profile/route.ts");
assert.match(profileApi, /prayerTelegramAlertsEnabled/);
assert.match(profileApi, /prayerEmailCopiesEnabled/);
const usersApi = source("src/app/api/admin/users/[id]/route.ts");
assert.match(usersApi, /prayerTelegramAlertsEnabled/);
assert.match(usersApi, /prayerEmailCopiesEnabled/);
assert.match(usersApi, /cannot_change_super_admin_preferences/);
const userMgmt = source("src/components/admin/UserManagement.tsx");
assert.match(userMgmt, /prayerTelegramAlertsEnabled/);
assert.match(userMgmt, /Recibir peticiones de oración por Telegram/);
assert.match(userMgmt, /Recibir copias por correo de peticiones de oración/);
const profileSettings = source("src/components/admin/ProfileSettings.tsx");
assert.match(profileSettings, /Receive prayer requests via Telegram/);
assert.match(profileSettings, /Receive prayer request email copies/);
const usersPage = source("src/app/admin/users/page.tsx");
assert.match(usersPage, /prayerTelegramAlertsEnabled: true/);

// Public form unchanged: name + message only
const form = source("src/components/prayer/PrayerForm.tsx");
assert.match(form, /PRAYER_MESSAGE_MAX_LENGTH = 500/);
assert.doesNotMatch(form, /name="email"|name="phone"|name="whatsapp"|name="country/);

// Migration additive
const migration = source("prisma/migrations/20261017000000_prayer_alert_preferences/migration.sql");
assert.match(migration, /ADD COLUMN "prayer_telegram_alerts_enabled"/);
assert.match(migration, /ADD COLUMN "prayer_email_copies_enabled"/);
assert.ok(!migration.toUpperCase().includes("DROP "));
assert.ok(!migration.toUpperCase().includes("DELETE FROM"));

// Webhook failure never blocks the public prayer response
const webhookMod = readFileSync(join(root, "src/lib/prayer-external-notifications.ts"), "utf8");
assert.match(webhookMod, /catch \{\s*return false/);
assert.match(prayerRoute, /catch \{\s*\/\/ External delivery/);

console.log("verify-prayer-alert-recipients: all checks passed");
