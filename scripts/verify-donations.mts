import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import type {ApplicationRole} from "../src/generated/prisma/client";
import {canManageDonations, canViewDonations} from "../src/lib/access";

const role = (name: "SUPER_ADMIN" | "ADMIN" | "TREASURER" | "USHER"): ApplicationRole =>
  name as unknown as ApplicationRole;
import {getPaymentsStatus, isProviderId, readPaymentsEnv} from "../src/lib/payments/config";
import {
  canTransitionDonation,
  canVerifyPaypalWebhook,
  isDonationStatus,
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

// Square signature fixtures: valid accepted, anything else rejected
const payload = JSON.stringify({event_id: "evt_1", type: "payment.updated"});
const key = "sig-key";
const good = createHmac("sha256", key).update(payload, "utf8").digest("base64");
assert.equal(verifySquareSignature({payload, signature: good, signatureKey: key}), true);
assert.equal(verifySquareSignature({payload, signature: good, signatureKey: "wrong"}), false);
assert.equal(verifySquareSignature({payload: `${payload} `, signature: good, signatureKey: key}), false);
assert.equal(verifySquareSignature({payload, signature: "", signatureKey: key}), false);
assert.equal(verifySquareSignature({payload, signature: good, signatureKey: ""}), false);

// PayPal is unverifiable without full configuration
assert.equal(canVerifyPaypalWebhook("", "", ""), false);
assert.equal(canVerifyPaypalWebhook("c", "s", ""), false);
assert.equal(canVerifyPaypalWebhook("c", "s", "w"), true);

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
assert.match(squareRoute, /invalid_signature/);
assert.match(squareRoute, /status: 401/);
assert.match(squareRoute, /duplicate/);
assert.match(squareRoute, /provider_externalId/);
assert.match(squareRoute, /DONATION_WEBHOOK_PROCESSED/);
assert.ok(squareRoute.indexOf("invalid_signature") < squareRoute.indexOf("donationWebhookEvent.create"));
assert.ok(!squareRoute.includes("hasValidPublicOrigin"));

// Wiring: admin module uses view permission, shows readiness without secrets
const donationsPage = readFileSync(join(root, "src/app/admin/donations/page.tsx"), "utf8");
assert.match(donationsPage, /canViewDonations/);
assert.match(donationsPage, /getPaymentsStatus/);
assert.ok(!donationsPage.includes("CLIENT_SECRET"));
assert.ok(!donationsPage.includes("ACCESS_TOKEN"));
assert.ok(!donationsPage.includes("SIGNATURE_KEY"));
const navigation = readFileSync(join(root, "src/components/admin/AdminNavigation.tsx"), "utf8");
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
console.log("  - Square HMAC fixtures accepted/rejected; PayPal unverifiable without credentials");
console.log("  - Webhook ledger keyed by provider+event; duplicates skipped; invalid signatures rejected pre-write");
