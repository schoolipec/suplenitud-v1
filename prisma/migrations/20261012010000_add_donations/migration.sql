CREATE TYPE "DonationStatus" AS ENUM ('PENDING','CONFIRMED','FAILED','REFUNDED');
CREATE TABLE "donations" ("id" UUID NOT NULL DEFAULT gen_random_uuid(),"provider" TEXT NOT NULL,"external_reference" TEXT NOT NULL,"amount" DECIMAL(12,2) NOT NULL,"currency" VARCHAR(3) NOT NULL,"campaign" TEXT NOT NULL,"status" "DonationStatus" NOT NULL DEFAULT 'PENDING',"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updated_at" TIMESTAMPTZ(6) NOT NULL,CONSTRAINT "donations_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "donations_external_reference_key" ON "donations"("external_reference");
CREATE INDEX "donations_provider_status_idx" ON "donations"("provider","status");
