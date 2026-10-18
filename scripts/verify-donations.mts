import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import type {ApplicationRole} from "../src/generated/prisma/client";
import {canManageDonations, canViewDonations} from "../src/lib/access";

const role = (name: "SUPER_ADMIN" | "ADMIN" | "TREASURER" | "USHER"): ApplicationRole =>
  name as unknown as ApplicationRole;
import {getPaymentsStatus, isMissingSecret, isProviderId, isSquareConfigured, readPaymentsEnv} from "../src/lib/payments/config";
import {
  canTransitionDonation,
  canVerifyPaypalWebhook,
  isDonationStatus,
  isUniqueViolation,
  paypalEventStatus,
  squarePaymentStatus,
  verifySquareSignature,
  webhookEventKey,
} from "../src/lib/payments/state";

const root = join(import.meta.dirname, "..");
const envOf = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

// Disabled or incomplete configuration never enables money movement
assert.deepEqual(getPaymentsStatus(envOf({})), {
  enabled: false,
  mode: "sandbox",
  paypal: "disabled",
  square: "disabled",
});
assert.equal(getPaymentsStatus(envOf({PAYMENTS_ENABLED: "true"})).paypal, "missing_credentials");
assert.equal(getPaymentsStatus(envOf({PAYMENTS_ENABLED: "true"})).square, "missing_credentials");
const liveFull = envOf({
  PAYMENTS_ENABLED: "true",
  PAYMENTS_MODE: "live",
  PAYPAL_CLIENT_ID: "cid",
  PAYPAL_CLIENT_SECRET: "sekret",
  PAYPAL_WEBHOOK_ID: "wid",
  SQUARE_APPLICATION_ID: "app",
  SQUARE_LOCATION_ID: "loc",
  SQUARE_ACCESS_TOKEN: "tok",
  SQUARE_WEBHOOK_SIGNATURE_KEY: "key",
  SQUARE_WEBHOOK_NOTIFICATION_URL: "https://demo.suplenitud.com/api/webhooks/square",
});
assert.deepEqual(getPaymentsStatus(liveFull), {
  enabled: true,
  mode: "live",
  paypal: "live_ready",
  square: "live_ready",
});
assert.equal(getPaymentsStatus(envOf({PAYMENTS_ENABLED: "true", PAYPAL_CLIENT_ID: "c", PAYPAL_CLIENT_SECRET: "s", PAYPAL_WEBHOOK_ID: "w"})).paypal, "sandbox_ready");
assert.equal(readPaymentsEnv(envOf({PAYMENTS_MODE: "production"})).mode, "sandbox");

// Readiness labels can never carry secret values to the client
const leaked = JSON.stringify(getPaymentsStatus(liveFull));
for (const secret of ["sekret", "tok", "key", "cid", "wid", "app", "loc"]) {
  assert.ok(!leaked.includes(secret), `secret leaked: ${secret}`);
}
assert.equal(isProviderId("PAYPAL"), true);
assert.equal(isProviderId("SQUARE"), true);
assert.equal(isProviderId("STRIPE"), false);

// Permission matrix: existing roles untouched, donations viewing extended as approved
assert.equal(canViewDonations([role("SUPER_ADMIN")]), true);
assert.equal(canViewDonations([role("ADMIN")]), true);
assert.equal(canViewDonations([role("TREASURER")]), true);
assert.equal(canViewDonations([role("USHER")]), false);
assert.equal(canViewDonations([] as ApplicationRole[]), false);
assert.equal(canManageDonations([role("SUPER_ADMIN")]), true);
assert.equal(canManageDonations([role("TREASURER")]), true);
assert.equal(canManageDonations([role("ADMIN")]), false);
assert.equal(canManageDonations([role("USHER")]), false);

// Lifecycle: COMPLETED only reachable from APPROVED (or legacy CONFIRMED)
assert.equal(isDonationStatus("COMPLETED"), true);
assert.equal(isDonationStatus("CANCELLED"), true);
assert.equal(isDonationStatus("NOPE"), false);
assert.equal(canTransitionDonation("PENDING", "APPROVED"), true);
assert.equal(canTransitionDonation("PENDING", "COMPLETED"), false);
assert.equal(canTransitionDonation("PENDING", "FAILED"), true);
assert.equal(canTransitionDonation("PENDING", "CANCELLED"), true);
assert.equal(canTransitionDonation("APPROVED", "COMPLETED"), true);
assert.equal(canTransitionDonation("APPROVED", "REFUNDED"), true);
assert.equal(canTransitionDonation("COMPLETED", "REFUNDED"), true);
assert.equal(canTransitionDonation("COMPLETED", "PENDING"), false);
assert.equal(canTransitionDonation("FAILED", "COMPLETED"), false);
assert.equal(canTransitionDonation("CANCELLED", "COMPLETED"), false);
assert.equal(canTransitionDonation("REFUNDED", "COMPLETED"), false);
assert.equal(canTransitionDonation("CONFIRMED", "COMPLETED"), true);

// Provider event mappings, unknown events ignored
assert.equal(paypalEventStatus("CHECKOUT.ORDER.APPROVED"), "APPROVED");
assert.equal(paypalEventStatus("PAYMENT.CAPTURE.COMPLETED"), "COMPLETED");
assert.equal(paypalEventStatus("PAYMENT.CAPTURE.DENIED"), "FAILED");
assert.equal(paypalEventStatus("PAYMENT.CAPTURE.REFUNDED"), "REFUNDED");
assert.equal(paypalEventStatus("BILLING.SUBSCRIPTION.CREATED"), null);
assert.equal(squarePaymentStatus("COMPLETED"), "COMPLETED");
assert.equal(squarePaymentStatus("APPROVED"), "APPROVED");
assert.equal(squarePaymentStatus("CANCELED"), "CANCELLED");
assert.equal(squarePaymentStatus("REFUNDED"), "REFUNDED");
assert.equal(squarePaymentStatus("PENDING"), null);

// Square signature fixtures over notificationUrl + rawBody: valid accepted, anything else rejected
const notifyUrl = "https://demo.suplenitud.com/api/webhooks/square";
const payload = JSON.stringify({event_id: "evt_1", type: "payment.updated"});
const key = "sig-key";
const sign = (url: string, body: string, secret: string) =>
  createHmac("sha256", secret).update(`${url}${body}`, "utf8").digest("base64");
const good = sign(notifyUrl, payload, key);
const base = {notificationUrl: notifyUrl, payload, signature: good, signatureKey: key};
assert.equal(verifySquareSignature(base), true);
assert.equal(verifySquareSignature({...base, payload: `${payload} `}), false);
assert.equal(verifySquareSignature({...base, notificationUrl: "https://demo.suplenitud.com/api/webhooks/paypal"}), false);
assert.equal(verifySquareSignature({...base, signature: "bogus"}), false);
assert.equal(verifySquareSignature({...base, signatureKey: ""}), false);
assert.equal(verifySquareSignature({...base, notificationUrl: ""}), false);
// Body-only signatures from the old scheme never verify
const bodyOnly = createHmac("sha256", key).update(payload, "utf8").digest("base64");
assert.equal(verifySquareSignature({...base, signature: bodyOnly}), false);

// PayPal is unverifiable without full configuration
assert.equal(canVerifyPaypalWebhook("", "", ""), false);
assert.equal(canVerifyPaypalWebhook("c", "s", ""), false);
assert.equal(canVerifyPaypalWebhook("c", "s", "w"), true);
assert.equal(canVerifyPaypalWebhook("CHANGE_ME", "s", "w"), false);
assert.equal(canVerifyPaypalWebhook("c", "example-secret", "w"), false);

// Placeholders are never credentials, even with payments enabled
assert.equal(isMissingSecret(""), true);
assert.equal(isMissingSecret("CHANGE_ME"), true);
assert.equal(isMissingSecret("change-me"), true);
assert.equal(isMissingSecret("example-key"), true);
assert.equal(isMissingSecret("replace-with-real"), true);
assert.equal(isMissingSecret("YOUR_PLACEHOLDER"), true);
assert.equal(isMissingSecret("real-secret-value"), false);
assert.equal(isMissingSecret(null), true);
const placeholderEnv = envOf({
  PAYMENTS_ENABLED: "true",
  PAYPAL_CLIENT_ID: "CHANGE_ME",
  PAYPAL_CLIENT_SECRET: "example",
  PAYPAL_WEBHOOK_ID: "w",
  SQUARE_APPLICATION_ID: "app",
  SQUARE_LOCATION_ID: "loc",
  SQUARE_ACCESS_TOKEN: "CHANGE_ME",
  SQUARE_WEBHOOK_SIGNATURE_KEY: "placeholder",
  SQUARE_WEBHOOK_NOTIFICATION_URL: "https://demo.suplenitud.com/api/webhooks/square",
});
assert.equal(getPaymentsStatus(placeholderEnv).paypal, "missing_credentials");
assert.equal(getPaymentsStatus(placeholderEnv).square, "missing_credentials");
assert.equal(isSquareConfigured(readPaymentsEnv(placeholderEnv).secrets), false);
assert.equal(
  isSquareConfigured(
    readPaymentsEnv(envOf({
      SQUARE_APPLICATION_ID: "app",
      SQUARE_LOCATION_ID: "loc",
      SQUARE_ACCESS_TOKEN: "tok",
      SQUARE_WEBHOOK_SIGNATURE_KEY: "key",
      SQUARE_WEBHOOK_NOTIFICATION_URL: "https://demo.suplenitud.com/api/webhooks/square",
    })).secrets,
  ),
  true,
);

// Unique violations map to the duplicate path, everything else rethrows
assert.equal(isUniqueViolation({code: "P2002"}), true);
assert.equal(isUniqueViolation({code: "P2025"}), false);
assert.equal(isUniqueViolation(new Error("boom")), false);
assert.equal(isUniqueViolation(null), false);

// Idempotency key shape matches the UNIQUE(provider, external_id) ledger
assert.equal(webhookEventKey("SQUARE", "evt_1"), "SQUARE:evt_1");

// Wiring: only the verified Square webhook can write COMPLETED
const checkoutRoute = readFileSync(join(root, "src/app/api/donations/checkout/route.ts"), "utf8");
assert.ok(!checkoutRoute.includes("COMPLETED"));
assert.match(checkoutRoute, /result\.reason/);
assert.match(checkoutRoute, /not_implemented/);
const providersLib = readFileSync(join(root, "src/lib/payments/providers.ts"), "utf8");
assert.match(providersLib, /payments_disabled/);
assert.match(providersLib, /missing_credentials/);
assert.match(providersLib, /never fabricates approval URLs/);
const paypalRoute = readFileSync(join(root, "src/app/api/webhooks/paypal/route.ts"), "utf8");
assert.ok(!paypalRoute.includes("prisma"));
assert.ok(!paypalRoute.includes("COMPLETED\""));
assert.match(paypalRoute, /payments_disabled/);
assert.match(paypalRoute, /not_implemented/);
const squareRoute = readFileSync(join(root, "src/app/api/webhooks/square/route.ts"), "utf8");
assert.match(squareRoute, /isSquareConfigured/);
assert.match(squareRoute, /status: 503/);
assert.match(squareRoute, /not_implemented/);
assert.match(squareRoute, /status: 501/);
// No writes from webhooks in this phase: routes never touch Prisma
assert.ok(!squareRoute.includes("prisma."));
assert.ok(!squareRoute.includes("processSquareWebhookEvent"));
const paypalWiring = readFileSync(join(root, "src/app/api/webhooks/paypal/route.ts"), "utf8");
assert.ok(!paypalWiring.includes("prisma."));
// Future processor: single transaction, provider-scoped lookup, duplicate-safe
const squareService = readFileSync(join(root, "src/lib/payments/square.ts"), "utf8");
assert.match(squareService, /prisma\.\$transaction/);
assert.match(squareService, /donationWebhookEvent\.create/);
assert.match(squareService, /provider: "SQUARE"/);
assert.match(squareService, /externalReference: input\.paymentId/);
assert.match(squareService, /canTransitionDonation/);
assert.match(squareService, /processed: true/);
assert.match(squareService, /DONATION_WEBHOOK_PROCESSED/);
assert.match(squareService, /isUniqueViolation/);
assert.match(squareService, /duplicate: true/);
assert.equal(squareService.match(/prisma\.\$transaction/g)?.length ?? 0, 1);

// Wiring: admin module uses view permission, shows readiness without secrets
const donationsPage = readFileSync(join(root, "src/app/admin/donations/page.tsx"), "utf8");
assert.match(donationsPage, /canViewDonations/);
assert.match(donationsPage, /getPaymentsStatus/);
assert.ok(!donationsPage.includes("CLIENT_SECRET"));
assert.ok(!donationsPage.includes("ACCESS_TOKEN"));
assert.ok(!donationsPage.includes("SIGNATURE_KEY"));
const navigation = readFileSync(join(root, "src/components/admin/AdminSidebar.tsx"), "utf8");
assert.ok(navigation.includes('roles.includes("ADMIN")'));

// Migration: additive only, idempotent webhook ledger
const migration = readFileSync(join(root, "prisma/migrations/20261017000000_donations_foundation/migration.sql"), "utf8");
assert.match(migration, /ADD VALUE 'APPROVED'/);
assert.match(migration, /ADD VALUE 'COMPLETED'/);
assert.match(migration, /ADD VALUE 'CANCELLED'/);
assert.match(migration, /ADD COLUMN "fund"/);
assert.match(migration, /ADD COLUMN "reconciled_at"/);
assert.match(migration, /donation_webhook_events/);
assert.match(migration, /\("provider", "external_id"\)/);
assert.ok(!migration.toUpperCase().includes("DROP "));
assert.ok(!migration.toUpperCase().includes("DELETE FROM"));

console.log("verify-donations: all checks passed");
console.log("  - Disabled/incomplete configuration never enables money movement");
console.log("  - Readiness labels carry no secrets; roles unchanged, donations view extended as approved");
console.log("  - COMPLETED reachable only from APPROVED/CONFIRMED via verified webhooks");
console.log("  - Square HMAC over URL+body accepted/rejected; placeholders never count as credentials");
console.log("  - Unique violations answer as duplicates, never 500; PayPal unverifiable without credentials");
console.log("  - Webhook routes write nothing this phase (503/501); future processor is transactional and duplicate-safe");
