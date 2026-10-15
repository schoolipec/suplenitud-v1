import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {PRAYER_MESSAGE_MAX_LENGTH, isValidMessage, isValidName, validatePrayerRequest} from "../src/lib/prayer-validation";

const root = join(import.meta.dirname, "..");
const source = (path: string) => readFileSync(join(root, path), "utf8");

assert.equal(PRAYER_MESSAGE_MAX_LENGTH, 500);
assert.equal(isValidMessage("A"), true);
assert.equal(isValidMessage("x".repeat(500)), true);
assert.equal(isValidMessage("x".repeat(501)), false);
assert.equal(isValidMessage("   "), false);
assert.equal(isValidName("A"), false);
assert.equal(isValidName("Ana"), true);
assert.deepEqual(validatePrayerRequest({name: "Ana", message: "Please pray."}), {valid: true, errors: []});
assert.equal(validatePrayerRequest({name: "Ana", message: "x".repeat(501)}).valid, false);
assert.equal(validatePrayerRequest({name: "A", message: "Please pray."}).valid, false);

const form = source("src/components/prayer/PrayerForm.tsx");
assert.match(form, /PRAYER_MESSAGE_MAX_LENGTH = 500/);
assert.match(form, /IconPhone/);
assert.match(form, /IconBrandWhatsapp/);
assert.match(form, /IconBrandTelegram/);
assert.match(form, /tel:\$\{churchPhone\}/);
assert.match(form, /wa\.me/);
assert.match(form, /t\.me/);
assert.match(form, /role="dialog"/);
assert.match(form, /aria-modal="true"/);
assert.match(form, /setIsSuccessOpen\(false\)/);
assert.match(form, /en:/);
assert.match(form, /es:/);
assert.match(form, /pt:/);
assert.match(form, /ko:/);
assert.match(form, /de:/);
assert.doesNotMatch(form, /email/i);
assert.doesNotMatch(form, /contactChannel/);

const route = source("src/app/api/prayer/route.ts");
assert.match(route, /publicPrayerRequestsEnabled/);
assert.match(route, /requestType: "PRAYER_ONLY"/);
assert.match(route, /consentToContact: false/);
assert.match(route, /notifyAdmins\(\{type: "NEW_PRAYER_REQUEST"/);
assert.doesNotMatch(route, /availabilitySlotId/);
assert.doesNotMatch(route, /phone:/);
assert.doesNotMatch(route, /whatsapp:/);

const publicFeatures = source("src/lib/public-features.ts");
assert.match(publicFeatures, /!== "false"/);
console.log("verify:prayer-contact passed");
