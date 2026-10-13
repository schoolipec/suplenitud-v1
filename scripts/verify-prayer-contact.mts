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
  validatePrayerRequest,
} from "../src/lib/prayer-validation";

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

// Invalid: missing availability slot
const missingSlot = validatePrayerRequest({
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
assert.equal(missingSlot.valid, false);
assert.ok(missingSlot.errors.includes("invalid_availability_slot"));

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
console.log("  - Time zone validation (IANA)");
console.log("  - Status transition validation");
console.log("  - API routes protected with requireMinistryManager + hasValidPublicOrigin");
console.log("  - CSV export with audit logging");
console.log("  - Notification preferences (internal only)");
