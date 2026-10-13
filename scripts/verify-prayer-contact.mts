import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {
  isDirectContactCountry,
  getAvailableChannels,
  isValidCountryCode,
  isValidContactChannel,
  isValidPhoneNumber,
  isValidWhatsAppNumber,
  isValidTimeZone,
  isValidMessage,
  isValidEmail,
  isValidName,
  isValidAvailabilityWeekday,
  isValidTimeFormat,
  isValidAvailabilityRange,
  canTransitionTo,
  canAssignContact,
  validatePrayerRequest,
} from "../src/lib/prayer-validation";
import {
  buildPublicSlot,
  isSlotCompatibleWithChannel,
  isUuid,
  validateAvailabilitySlotForChannel,
  wallTimeToUtc,
} from "../src/lib/prayer-availability";
import {isPrayerNotificationType, PRAYER_NOTIFICATION_TYPES} from "../src/lib/prayer-notifications";

const root = join(import.meta.dirname, "..");

// Country and channel validation
assert.equal(isDirectContactCountry("US"), true);
assert.equal(isDirectContactCountry("CA"), true);
assert.equal(isDirectContactCountry("MX"), true);
assert.equal(isDirectContactCountry("GB"), false);
assert.equal(isDirectContactCountry("BR"), false);

assert.deepEqual(getAvailableChannels("US"), ["PHONE", "WHATSAPP"]);
assert.deepEqual(getAvailableChannels("CA"), ["PHONE", "WHATSAPP"]);
assert.deepEqual(getAvailableChannels("MX"), ["PHONE", "WHATSAPP"]);
assert.deepEqual(getAvailableChannels("GB"), ["WHATSAPP"]);
assert.deepEqual(getAvailableChannels("BR"), ["WHATSAPP"]);

// Country code validation
assert.equal(isValidCountryCode("US"), true);
assert.equal(isValidCountryCode("CA"), true);
assert.equal(isValidCountryCode("us"), false);
assert.equal(isValidCountryCode("USA"), false);
assert.equal(isValidCountryCode(""), false);
assert.equal(isValidCountryCode(null), false);

// Contact channel validation
assert.equal(isValidContactChannel("PHONE"), true);
assert.equal(isValidContactChannel("WHATSAPP"), true);
assert.equal(isValidContactChannel("EMAIL"), false);
assert.equal(isValidContactChannel(""), false);
assert.equal(isValidContactChannel(null), false);

// Phone validation
assert.equal(isValidPhoneNumber("+1234567890"), true);
assert.equal(isValidPhoneNumber("1234567890"), true);
assert.equal(isValidPhoneNumber("+1 (234) 567-8901"), true);
assert.equal(isValidPhoneNumber("123"), false);
assert.equal(isValidPhoneNumber(""), false);
assert.equal(isValidPhoneNumber(null), false);
assert.equal(isValidPhoneNumber("abcdefghij"), false);

// WhatsApp validation
assert.equal(isValidWhatsAppNumber("+1234567890"), true);
assert.equal(isValidWhatsAppNumber("1234567890"), true);
assert.equal(isValidWhatsAppNumber("+1 (234) 567-8901"), true);
assert.equal(isValidWhatsAppNumber("123"), false);
assert.equal(isValidWhatsAppNumber(""), false);
assert.equal(isValidWhatsAppNumber(null), false);

// Time zone validation
assert.equal(isValidTimeZone("America/Los_Angeles"), true);
assert.equal(isValidTimeZone("Europe/London"), true);
assert.equal(isValidTimeZone("Asia/Tokyo"), true);
assert.equal(isValidTimeZone("Invalid/Zone"), false);
assert.equal(isValidTimeZone(""), false);
assert.equal(isValidTimeZone(null), false);

// Message validation
assert.equal(isValidMessage("This is a valid prayer request message."), true);
assert.equal(isValidMessage("Short"), false);
assert.equal(isValidMessage(""), false);
assert.equal(isValidMessage(null), false);
assert.equal(isValidMessage("a".repeat(2001)), false);
assert.equal(isValidMessage("a".repeat(2000)), true);

// Email validation
assert.equal(isValidEmail(""), true);
assert.equal(isValidEmail(null), true);
assert.equal(isValidEmail("test@example.com"), true);
assert.equal(isValidEmail("invalid"), false);
assert.equal(isValidEmail("test@"), false);
assert.equal(isValidEmail("@example.com"), false);

// Name validation
assert.equal(isValidName("John Doe"), true);
assert.equal(isValidName("A"), false);
assert.equal(isValidName(""), false);
assert.equal(isValidName(null), false);
assert.equal(isValidName("a".repeat(101)), false);

// Availability weekday validation
assert.equal(isValidAvailabilityWeekday(0), true);
assert.equal(isValidAvailabilityWeekday(6), true);
assert.equal(isValidAvailabilityWeekday(-1), false);
assert.equal(isValidAvailabilityWeekday(7), false);
assert.equal(isValidAvailabilityWeekday(1.5), false);
assert.equal(isValidAvailabilityWeekday("1"), false);

// Time format validation
assert.equal(isValidTimeFormat("09:00"), true);
assert.equal(isValidTimeFormat("17:30"), true);
assert.equal(isValidTimeFormat("25:00"), false);
assert.equal(isValidTimeFormat("12:60"), false);
assert.equal(isValidTimeFormat("9:00"), false);
assert.equal(isValidTimeFormat("09:0"), false);
assert.equal(isValidTimeFormat(""), false);

// Availability range validation
assert.equal(isValidAvailabilityRange("09:00", "17:00"), true);
assert.equal(isValidAvailabilityRange("17:00", "09:00"), false);
assert.equal(isValidAvailabilityRange("09:00", "09:00"), false);

// Status transition validation
assert.equal(canTransitionTo("NEW", "PENDING_ASSIGNMENT"), true);
assert.equal(canTransitionTo("NEW", "ASSIGNED"), true);
assert.equal(canTransitionTo("NEW", "CLOSED"), true);
assert.equal(canTransitionTo("NEW", "CONTACTED"), false);
assert.equal(canTransitionTo("PENDING_ASSIGNMENT", "ASSIGNED"), true);
assert.equal(canTransitionTo("PENDING_ASSIGNMENT", "CLOSED"), true);
assert.equal(canTransitionTo("ASSIGNED", "CONTACTED"), true);
assert.equal(canTransitionTo("ASSIGNED", "CLOSED"), true);
assert.equal(canTransitionTo("CONTACTED", "CLOSED"), true);
assert.equal(canTransitionTo("CLOSED", "NEW"), false);
assert.equal(canTransitionTo("CLOSED", "ASSIGNED"), false);

// Assignment consent gate: contact assignment requires contact-type request,
// explicit contact consent, and a non-closed request
assert.deepEqual(
  canAssignContact({requestType: "PRAYER_AND_CONTACT", consentToContact: true, status: "NEW"}),
  {allowed: true, reason: "ok"},
);
assert.deepEqual(
  canAssignContact({requestType: "PRAYER_AND_CONTACT", consentToContact: true, status: "PENDING_ASSIGNMENT"}),
  {allowed: true, reason: "ok"},
);
assert.deepEqual(
  canAssignContact({requestType: "PRAYER_AND_CONTACT", consentToContact: true, status: "ASSIGNED"}),
  {allowed: true, reason: "ok"},
);
// PRAYER_ONLY + contactId => rejected, even with open status
assert.deepEqual(
  canAssignContact({requestType: "PRAYER_ONLY", consentToContact: false, status: "NEW"}),
  {allowed: false, reason: "request_type_not_contact"},
);
// Contact type but consent revoked (including inherited rows) => rejected
assert.deepEqual(
  canAssignContact({requestType: "PRAYER_AND_CONTACT", consentToContact: false, status: "NEW"}),
  {allowed: false, reason: "contact_consent_missing"},
);
assert.deepEqual(
  canAssignContact({requestType: "PRAYER_AND_CONTACT", consentToContact: false, status: "PENDING_ASSIGNMENT"}),
  {allowed: false, reason: "contact_consent_missing"},
);
// CLOSED request + contactId => rejected even with consent
assert.deepEqual(
  canAssignContact({requestType: "PRAYER_AND_CONTACT", consentToContact: true, status: "CLOSED"}),
  {allowed: false, reason: "request_closed"},
);
// Missing fields default to rejection, never to silent assignment
assert.deepEqual(canAssignContact({}), {allowed: false, reason: "request_type_not_contact"});
// Closing a PRAYER_ONLY request without assignment stays allowed
assert.equal(canTransitionTo("NEW", "CLOSED"), true);

// Full prayer request validation - PRAYER_ONLY
const prayerOnlyValid = validatePrayerRequest({
  requestType: "PRAYER_ONLY",
  message: "Please pray for my family.",
  name: "John Doe",
  email: "john@example.com",
  consentToStore: true,
});
assert.equal(prayerOnlyValid.valid, true);
assert.deepEqual(prayerOnlyValid.errors, []);

// Full prayer request validation - PRAYER_AND_CONTACT
const prayerAndContactValid = validatePrayerRequest({
  requestType: "PRAYER_AND_CONTACT",
  message: "Please pray for my family.",
  name: "John Doe",
  email: "john@example.com",
  consentToStore: true,
  consentToContact: true,
  country: "US",
  contactChannel: "PHONE",
  phone: "+1234567890",
  timeZone: "America/Los_Angeles",
  availabilitySlotId: "550e8400-e29b-41d4-a716-446655440000",
});
assert.equal(prayerAndContactValid.valid, true);
assert.deepEqual(prayerAndContactValid.errors, []);

// Invalid: missing consent
const missingConsent = validatePrayerRequest({
  requestType: "PRAYER_ONLY",
  message: "Please pray for my family.",
  name: "John Doe",
  consentToStore: false,
});
assert.equal(missingConsent.valid, false);
assert.ok(missingConsent.errors.includes("consent_to_store_required"));

// Invalid: missing contact consent
const missingContactConsent = validatePrayerRequest({
  requestType: "PRAYER_AND_CONTACT",
  message: "Please pray for my family.",
  name: "John Doe",
  consentToStore: true,
  consentToContact: false,
  country: "US",
  contactChannel: "PHONE",
  phone: "+1234567890",
  timeZone: "America/Los_Angeles",
  availabilitySlotId: "550e8400-e29b-41d4-a716-446655440000",
});
assert.equal(missingContactConsent.valid, false);
assert.ok(missingContactConsent.errors.includes("consent_to_contact_required"));

// Invalid: wrong channel for country
const wrongChannel = validatePrayerRequest({
  requestType: "PRAYER_AND_CONTACT",
  message: "Please pray for my family.",
  name: "John Doe",
  consentToStore: true,
  consentToContact: true,
  country: "GB",
  contactChannel: "PHONE",
  phone: "+1234567890",
  timeZone: "Europe/London",
  availabilitySlotId: "550e8400-e29b-41d4-a716-446655440000",
});
assert.equal(wrongChannel.valid, false);
assert.ok(wrongChannel.errors.includes("invalid_contact_channel"));

// Invalid: missing phone for PHONE channel
const missingPhone = validatePrayerRequest({
  requestType: "PRAYER_AND_CONTACT",
  message: "Please pray for my family.",
  name: "John Doe",
  consentToStore: true,
  consentToContact: true,
  country: "US",
  contactChannel: "PHONE",
  phone: "",
  timeZone: "America/Los_Angeles",
  availabilitySlotId: "550e8400-e29b-41d4-a716-446655440000",
});
assert.equal(missingPhone.valid, false);
assert.ok(missingPhone.errors.includes("invalid_phone"));

// Optional: contact request without a slot is valid and flows to PENDING_ASSIGNMENT
const pendingWithoutSlot = validatePrayerRequest({
  requestType: "PRAYER_AND_CONTACT",
  message: "Please pray for my family.",
  name: "John Doe",
  consentToStore: true,
  consentToContact: true,
  country: "US",
  contactChannel: "WHATSAPP",
  whatsapp: "+1234567890",
  timeZone: "America/Los_Angeles",
});
assert.equal(pendingWithoutSlot.valid, true);
assert.deepEqual(pendingWithoutSlot.errors, []);

const pendingEmptySlot = validatePrayerRequest({
  requestType: "PRAYER_AND_CONTACT",
  message: "Please pray for my family.",
  name: "John Doe",
  consentToStore: true,
  consentToContact: true,
  country: "US",
  contactChannel: "WHATSAPP",
  whatsapp: "+1234567890",
  timeZone: "America/Los_Angeles",
  availabilitySlotId: "",
});
assert.equal(pendingEmptySlot.valid, true);

// Invalid: malformed slot id is still rejected at format level
const malformedSlot = validatePrayerRequest({
  requestType: "PRAYER_AND_CONTACT",
  message: "Please pray for my family.",
  name: "John Doe",
  consentToStore: true,
  consentToContact: true,
  country: "US",
  contactChannel: "WHATSAPP",
  whatsapp: "+1234567890",
  timeZone: "America/Los_Angeles",
  availabilitySlotId: "550e8400-e29b-41d4-a716-446655440000-extra",
});
assert.equal(malformedSlot.valid, false);
assert.ok(malformedSlot.errors.includes("invalid_availability_slot"));

// UUID contract: only real UUIDs travel from availability to POST
assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000-2026-10-19"), false);
assert.equal(isUuid(""), false);
assert.equal(isUuid(null), false);

// Slot/channel compatibility matrix (server-side gate)
const baseSlot = {active: true, contactActive: true, contactAuthorized: true, contactPhone: "+1234567890", contactWhatsapp: "+1234567890"};
assert.deepEqual(validateAvailabilitySlotForChannel(baseSlot, "PHONE"), {ok: true, reason: "ok"});
assert.deepEqual(validateAvailabilitySlotForChannel(baseSlot, "WHATSAPP"), {ok: true, reason: "ok"});
assert.deepEqual(validateAvailabilitySlotForChannel(null, "PHONE"), {ok: false, reason: "slot_not_found"});
assert.deepEqual(validateAvailabilitySlotForChannel({...baseSlot, active: false}, "PHONE"), {ok: false, reason: "slot_inactive"});
assert.deepEqual(validateAvailabilitySlotForChannel({...baseSlot, contactAuthorized: false}, "PHONE"), {ok: false, reason: "contact_not_authorized"});
assert.deepEqual(validateAvailabilitySlotForChannel({...baseSlot, contactActive: false}, "WHATSAPP"), {ok: false, reason: "contact_not_authorized"});
assert.deepEqual(validateAvailabilitySlotForChannel({...baseSlot, contactPhone: null}, "PHONE"), {ok: false, reason: "channel_not_available"});
assert.deepEqual(validateAvailabilitySlotForChannel({...baseSlot, contactPhone: "  "}, "PHONE"), {ok: false, reason: "channel_not_available"});
assert.deepEqual(validateAvailabilitySlotForChannel({...baseSlot, contactWhatsapp: null}, "WHATSAPP"), {ok: false, reason: "channel_not_available"});
assert.equal(isSlotCompatibleWithChannel({...baseSlot, contactPhone: null}, "WHATSAPP"), true);
assert.equal(isSlotCompatibleWithChannel({...baseSlot, contactWhatsapp: null}, "PHONE"), true);

// Real time-zone conversion: 09:00 Monday in Los Angeles is 12:00 Monday in New York (Oct 2026, DST)
const referenceMonday = new Date(Date.UTC(2026, 9, 12, 12, 0, 0));
const laMorning = wallTimeToUtc(2026, 10, 12, "09:00", "America/Los_Angeles");
assert.equal(laMorning.toISOString(), "2026-10-12T16:00:00.000Z");
const converted = buildPublicSlot(
  {id: "550e8400-e29b-41d4-a716-446655440000", weekday: 1, startTime: "09:00", endTime: "09:30", contactTimezone: "America/Los_Angeles"},
  "America/New_York",
  referenceMonday,
);
assert.ok(converted);
assert.equal(converted.id, "550e8400-e29b-41d4-a716-446655440000");
assert.match(converted.label, /12:00/);
assert.match(converted.label, /your time/);

// Weekday shift across the Pacific: Tuesday 09:00 in Tokyo is Monday afternoon in Los Angeles
const tokyoMorning = buildPublicSlot(
  {id: "660e8400-e29b-41d4-a716-446655440000", weekday: 2, startTime: "09:00", endTime: "09:30", contactTimezone: "Asia/Tokyo"},
  "America/Los_Angeles",
  referenceMonday,
);
assert.ok(tokyoMorning);
assert.match(tokyoMorning.label, /Mon/);

// Notification types cover the four approved internal events
assert.deepEqual([...PRAYER_NOTIFICATION_TYPES], ["NEW_PRAYER_REQUEST", "NEW_CONTACT_REQUEST", "PENDING_ASSIGNMENT", "ASSIGNMENT_MADE"]);
assert.equal(isPrayerNotificationType("NEW_PRAYER_REQUEST"), true);
assert.equal(isPrayerNotificationType("ASSIGNMENT_MADE"), true);
assert.equal(isPrayerNotificationType("TELEGRAM_SENT"), false);
assert.equal(isPrayerNotificationType(null), false);

// Check API routes exist
const prayerRoutePath = join(root, "src/app/api/prayer/route.ts");
const prayerRoute = readFileSync(prayerRoutePath, "utf8");
assert.match(prayerRoute, /validatePrayerRequest/);
assert.match(prayerRoute, /PRAYER_ONLY/);
assert.match(prayerRoute, /PRAYER_AND_CONTACT/);
assert.match(prayerRoute, /consentToStore/);
assert.match(prayerRoute, /consentToContact/);

const adminPrayerRoutePath = join(root, "src/app/api/admin/prayer-requests/route.ts");
const adminPrayerRoute = readFileSync(adminPrayerRoutePath, "utf8");
assert.match(adminPrayerRoute, /requireMinistryManager/);
assert.match(adminPrayerRoute, /hasValidPublicOrigin/);

const adminPrayerIdRoutePath = join(root, "src/app/api/admin/prayer-requests/[id]/route.ts");
const adminPrayerIdRoute = readFileSync(adminPrayerIdRoutePath, "utf8");
assert.match(adminPrayerIdRoute, /requireMinistryManager/);
assert.match(adminPrayerIdRoute, /canTransitionTo/);
assert.match(adminPrayerIdRoute, /PRAYER_REQUEST_ASSIGNED/);

const exportRoutePath = join(root, "src/app/api/admin/prayer-requests/export/route.ts");
const exportRoute = readFileSync(exportRoutePath, "utf8");
assert.match(exportRoute, /requireMinistryManager/);
assert.match(exportRoute, /PRAYER_REQUEST_EXPORTED/);
assert.match(exportRoute, /text\/csv/);

const availabilityRoutePath = join(root, "src/app/api/admin/ministry-contact-availability/route.ts");
const availabilityRoute = readFileSync(availabilityRoutePath, "utf8");
assert.match(availabilityRoute, /requireMinistryManager/);
assert.match(availabilityRoute, /usherAvailability/);

const notificationRoutePath = join(root, "src/app/api/admin/notification-preferences/route.ts");
const notificationRoute = readFileSync(notificationRoutePath, "utf8");
assert.match(notificationRoute, /requireMinistryManager/);
assert.match(notificationRoute, /notificationPreference/);

// Public availability endpoint: no personal data, real UUID, channel filter, real conversion
const publicAvailabilityPath = join(root, "src/app/api/prayer/availability/route.ts");
const publicAvailability = readFileSync(publicAvailabilityPath, "utf8");
assert.match(publicAvailability, /buildPublicSlot/);
assert.match(publicAvailability, /isSlotCompatibleWithChannel/);
assert.match(publicAvailability, /invalid_contact_channel/);
assert.ok(!publicAvailability.includes("contactName"));
assert.ok(!publicAvailability.includes("telegram"));
assert.ok(!publicAvailability.includes("contactId:"));
// Phone/whatsapp are read server-side only for channel gating, never serialized:
// the response carries solely the safe slot shape built by buildPublicSlot.
assert.match(publicAvailability, /select: \{timezone: true, active: true, authorized: true, phone: true, whatsapp: true\}/);
assert.match(publicAvailability, /slots\.push\(slot\)/);
assert.match(publicAvailability, /PublicAvailabilitySlot/);

// POST validates the real slot server-side and allows pending without slot
assert.match(prayerRoute, /validateAvailabilitySlotForChannel/);
assert.match(prayerRoute, /PENDING_ASSIGNMENT/);
assert.match(prayerRoute, /notifyAdmins/);
assert.match(prayerRoute, /NEW_CONTACT_REQUEST/);

// Assignment consent gate: enforced before any assignment side effect
assert.match(adminPrayerIdRoute, /canAssignContact/);
assert.match(adminPrayerIdRoute, /assignment_not_allowed/);
assert.match(adminPrayerIdRoute, /status: 403/);
assert.ok(
  adminPrayerIdRoute.indexOf("assignment_not_allowed") < adminPrayerIdRoute.indexOf("prayerAssignment.create"),
  "gate must reject before creating a PrayerAssignment",
);
assert.ok(
  adminPrayerIdRoute.indexOf("assignment_not_allowed") < adminPrayerIdRoute.indexOf("ASSIGNMENT_MADE"),
  "gate must reject before emitting the assignment alert",
);
// Valid assignment keeps manual single authorized active contact
assert.match(adminPrayerIdRoute, /invalid_contact/);
assert.match(adminPrayerIdRoute, /assignments\[0\]/);

// Assignment notifies other admins, excluding the actor
assert.match(adminPrayerIdRoute, /notifyAdmins/);
assert.match(adminPrayerIdRoute, /ASSIGNMENT_MADE/);
assert.match(adminPrayerIdRoute, /excludeUserId/);

// Internal notifications: entity, listing/reading APIs, panel UI with read state
const notificationsApiPath = join(root, "src/app/api/admin/notifications/route.ts");
const notificationsApi = readFileSync(notificationsApiPath, "utf8");
assert.match(notificationsApi, /requireMinistryManager/);
assert.match(notificationsApi, /prayerNotification/);
assert.match(notificationsApi, /unreadCount/);
assert.match(notificationsApi, /read-all/);

const notificationIdApiPath = join(root, "src/app/api/admin/notifications/[id]/route.ts");
const notificationIdApi = readFileSync(notificationIdApiPath, "utf8");
assert.match(notificationIdApi, /requireMinistryManager/);
assert.match(notificationIdApi, /userId !== actor\.id/);

const notificationsLibPath = join(root, "src/lib/prayer-notifications.ts");
const notificationsLib = readFileSync(notificationsLibPath, "utf8");
assert.match(notificationsLib, /SUPER_ADMIN/);
assert.match(notificationsLib, /notifyAdmins/);
assert.ok(!notificationsLib.toLowerCase().includes("telegram"));
assert.ok(!notificationsLib.toLowerCase().includes("whatsapp") || notificationsLib.includes("contactWhatsapp") === false);

const notificationsPagePath = join(root, "src/app/admin/notifications/page.tsx");
assert.ok(readFileSync(notificationsPagePath, "utf8").includes("NotificationsList"));

const notificationsListPath = join(root, "src/components/admin/NotificationsList.tsx");
const notificationsList = readFileSync(notificationsListPath, "utf8");
assert.match(notificationsList, /Mark read/);
assert.match(notificationsList, /Mark all read/);
assert.match(notificationsList, /unread/);

// Integrity migration: foreign keys plus legacy consent correction
const integrityMigrationPath = join(root, "prisma/migrations/20261013210000_prayer_contact_integrity/migration.sql");
const integrityMigration = readFileSync(integrityMigrationPath, "utf8");
assert.match(integrityMigration, /prayer_assignments_contact_id_fkey/);
assert.match(integrityMigration, /usher_availability_contact_id_fkey/);
assert.match(integrityMigration, /prayer_requests_availability_slot_id_fkey/);
assert.match(integrityMigration, /consent_to_contact/);
assert.match(integrityMigration, /prayer_notifications/);

// Check components exist
const prayerFormPath = join(root, "src/components/prayer/PrayerForm.tsx");
const prayerForm = readFileSync(prayerFormPath, "utf8");
assert.match(prayerForm, /PRAYER_ONLY/);
assert.match(prayerForm, /PRAYER_AND_CONTACT/);
assert.match(prayerForm, /consentStore/);
assert.match(prayerForm, /consentContact/);
assert.match(prayerForm, /getAvailableChannels/);

const queuePath = join(root, "src/components/admin/PrayerRequestsQueue.tsx");
const queue = readFileSync(queuePath, "utf8");
assert.match(queue, /PRAYER_ONLY/);
assert.match(queue, /PRAYER_AND_CONTACT/);
assert.match(queue, /PENDING_ASSIGNMENT/);
assert.match(queue, /assignContact/);

const notificationSettingsPath = join(root, "src/components/admin/NotificationSettings.tsx");
const notificationSettings = readFileSync(notificationSettingsPath, "utf8");
assert.match(notificationSettings, /newPrayerRequest/);
assert.match(notificationSettings, /newContactRequest/);
assert.match(notificationSettings, /pendingAssignment/);
assert.match(notificationSettings, /assignmentMade/);

console.log("verify-prayer-contact: all checks passed");
console.log("  - Country and channel validation (US/CA/MX direct, others WhatsApp only)");
console.log("  - Consent validation (separate store and contact consent)");
console.log("  - Phone/WhatsApp validation (international format)");
console.log("  - Time zone validation (IANA) plus real contact-to-visitor conversion");
console.log("  - Availability contract: real UUID, optional slot, pending without slot, channel gating");
console.log("  - Status transition validation");
console.log("  - Assignment consent gate (PRAYER_ONLY, missing consent, CLOSED rejected; valid keeps single contact)");
console.log("  - Public availability exposes no personal data");
console.log("  - API routes protected with requireMinistryManager + hasValidPublicOrigin");
console.log("  - CSV export with audit logging");
console.log("  - Internal notifications per preference with read/unread UI (no external channels)");
console.log("  - Integrity migration: foreign keys plus legacy consent correction");
