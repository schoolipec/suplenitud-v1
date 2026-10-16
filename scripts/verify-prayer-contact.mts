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
assert.match(form, /from "@\/components\/ui\/Modal"/);
assert.match(form, /Modal open=\{isSuccessOpen\}/);
assert.match(form, /setIsSuccessOpen\(false\)/);
assert.doesNotMatch(form, /aria-modal="true"/);
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

// Simplified queue: reduced filters, Nueva/presentada labels, no assignment
const queueLib = source("src/lib/prayer-queue.ts");
assert.match(queueLib, /status: "ALL" \| "NEW" \| "CLOSED"/);
assert.doesNotMatch(queueLib, /contactChannel/);
assert.doesNotMatch(queueLib, /country/);
assert.match(queueLib, /PRAYER_STATUS_LABELS = \{NEW: "Nueva", CLOSED: "Presentada"\}/);
assert.match(queueLib, /canUpdatePrayer/);
assert.doesNotMatch(queueLib, /contactId/);
assert.doesNotMatch(queueLib, /usher/);
const queueApi = source("src/app/api/admin/prayer-requests/route.ts");
assert.match(queueApi, /parsePrayerFilters/);
assert.match(queueApi, /newCount/);
assert.doesNotMatch(queueApi, /contactChannel/);
const queuePatch = source("src/app/api/admin/prayer-requests/[id]/route.ts");
assert.match(queuePatch, /parsePrayerStatusUpdate/);
assert.match(queuePatch, /canUpdatePrayer/);
assert.match(queuePatch, /PRAYER_REQUEST_STATUS_CHANGED/);
assert.doesNotMatch(queuePatch, /contactId/);
assert.doesNotMatch(queuePatch, /usher/);
const queueUi = source("src/components/admin/PrayerRequestsQueue.tsx");
assert.match(queueUi, /from '@\/components\/ui\/Modal'/);
assert.match(queueUi, /Todas.*Nueva.*Presentada|Todas|Nuevas|Presentadas/);
assert.match(queueUi, /prayerStatusLabel/);
assert.match(queueLib, /Registro histórico/);
assert.doesNotMatch(queueUi, /assign/);
assert.doesNotMatch(queueUi, /contactChannel/);
assert.doesNotMatch(queueUi, /country/);
const exportRoute = source("src/app/api/admin/prayer-requests/export/route.ts");
assert.match(exportRoute, /prayerQueueCsv/);
assert.match(queueLib, /prayerQueueCsv/);
assert.match(queueLib, /prayerStatusLabel/);
assert.doesNotMatch(exportRoute, /phone/);
assert.doesNotMatch(exportRoute, /whatsapp/);

// Reusable accessible modal with Radix Dialog
const modal = source("src/components/ui/Modal.tsx");
assert.match(modal, /@radix-ui\/react-dialog/);
assert.match(modal, /Dialog\.Root/);
assert.match(modal, /Dialog\.Overlay/);
assert.match(modal, /Dialog\.Content/);
assert.match(modal, /Dialog\.Title/);
assert.match(modal, /Dialog\.Portal/);
assert.match(modal, /onOpenChange/);
assert.match(modal, /aria-describedby/);
const blessingModal = source("src/components/blessing/BlessingMessageModal.tsx");
assert.match(blessingModal, /from "@\/components\/ui\/Modal"/);
assert.doesNotMatch(blessingModal, /<dialog/);
assert.match(blessingModal, /30000/);
assert.match(blessingModal, /disabledKey/);
assert.match(blessingModal, /setOpen\(false\)/);
assert.match(form, /<Modal open=\{isSuccessOpen\}/);
assert.doesNotMatch(form, /prayer-modal-backdrop/);

// Non-regression: public form keeps 500 chars, name + message only
assert.match(route, /name,[\s\S]{0,30}message,/);
assert.doesNotMatch(route, /availabilitySlotId/);
assert.doesNotMatch(route, /contactChannel/);
assert.doesNotMatch(route, /country/);
console.log("verify:prayer-contact passed");
