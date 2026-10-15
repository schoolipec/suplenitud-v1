-- Donations foundation: explicit lifecycle states, optional fund, reconciliation
-- timestamp and an idempotent webhook event ledger. Non-destructive: only new
-- enum values, new nullable columns and a new table. Existing rows keep their
-- status, amounts and references untouched. CONFIRMED stays as a legacy value;
-- new code uses PENDING/APPROVED/COMPLETED/FAILED/CANCELLED/REFUNDED.

ALTER TYPE "DonationStatus" ADD VALUE 'APPROVED';
ALTER TYPE "DonationStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "DonationStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "donations" ADD COLUMN "fund" TEXT;
ALTER TABLE "donations" ADD COLUMN "reconciled_at" TIMESTAMPTZ(6);

CREATE TABLE "donation_webhook_events" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "donation_id" UUID,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(6),
  CONSTRAINT "donation_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "donation_webhook_events_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "donation_webhook_events_provider_external_id_key" ON "donation_webhook_events"("provider", "external_id");
CREATE INDEX "donation_webhook_events_provider_processed_idx" ON "donation_webhook_events"("provider", "processed");
