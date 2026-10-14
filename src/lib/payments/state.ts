import {createHmac, timingSafeEqual} from "node:crypto";

export const DONATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "CONFIRMED",
  "REFUNDED",
] as const;

export type DonationStatus = (typeof DONATION_STATUSES)[number];

const TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  PENDING: ["APPROVED", "FAILED", "CANCELLED"],
  APPROVED: ["COMPLETED", "FAILED", "CANCELLED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  CONFIRMED: ["COMPLETED", "REFUNDED"],
  REFUNDED: [],
};

export function isDonationStatus(value: unknown): value is DonationStatus {
  return typeof value === "string" && (DONATION_STATUSES as readonly string[]).includes(value);
}

export function canTransitionDonation(from: DonationStatus, to: DonationStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** PayPal event type to internal status. Unknown events return null and are ignored. */
export function paypalEventStatus(eventType: string): DonationStatus | null {
  if (eventType === "CHECKOUT.ORDER.APPROVED") return "APPROVED";
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") return "COMPLETED";
  if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.DECLINED") return "FAILED";
  if (eventType === "PAYMENT.CAPTURE.REFUNDED" || eventType === "PAYMENT.CAPTURE.REVERSED") return "REFUNDED";
  return null;
}

/** Square payment status to internal status. Unknown values return null and are ignored. */
export function squarePaymentStatus(status: string): DonationStatus | null {
  if (status === "APPROVED" || status === "AUTHORIZED") return "APPROVED";
  if (status === "COMPLETED" || status === "CAPTURED") return "COMPLETED";
  if (status === "FAILED") return "FAILED";
  if (status === "CANCELED") return "CANCELLED";
  if (status === "REFUNDED") return "REFUNDED";
  return null;
}

/** Idempotency key: one ledger row per provider event, enforced by UNIQUE(provider, external_id). */
export function webhookEventKey(provider: string, externalId: string): string {
  return `${provider}:${externalId}`;
}

function toBuffer(value: string): Buffer {
  return Buffer.from(value, "utf8");
}

/**
 * Verify a Square webhook signature (HMAC-SHA256 over the raw payload with the
 * webhook signature key, base64). Pure and fully testable with fixtures.
 */
export function verifySquareSignature(input: {payload: string; signature: string; signatureKey: string}): boolean {
  if (!input.payload || !input.signature || !input.signatureKey) return false;
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(
      createHmac("sha256", input.signatureKey).update(input.payload, "utf8").digest("base64"),
      "utf8",
    );
    actual = toBuffer(input.signature);
  } catch {
    return false;
  }
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * PayPal webhook verification requires a live call to PayPal's verification
 * endpoint with API credentials. Without configuration it is unverifiable by
 * design, so the handler must reject the event. Never trust it otherwise.
 */
export function canVerifyPaypalWebhook(clientId: string, clientSecret: string, webhookId: string): boolean {
  return clientId.length > 0 && clientSecret.length > 0 && webhookId.length > 0;
}
