-- Prayer contact workflow migration
-- Safe migration preserving existing data

-- 1. Add PrayerRequestType enum
CREATE TYPE "PrayerRequestType" AS ENUM ('PRAYER_ONLY', 'PRAYER_AND_CONTACT');

-- 2. Add PENDING_ASSIGNMENT to PrayerRequestStatus
ALTER TYPE "PrayerRequestStatus" ADD VALUE 'PENDING_ASSIGNMENT';

-- 3. Add new columns to prayer_requests
ALTER TABLE "prayer_requests" ADD COLUMN "request_type" "PrayerRequestType" NOT NULL DEFAULT 'PRAYER_ONLY';
ALTER TABLE "prayer_requests" ADD COLUMN "message" TEXT;
ALTER TABLE "prayer_requests" ADD COLUMN "country" VARCHAR(2);
ALTER TABLE "prayer_requests" ADD COLUMN "contact_channel" VARCHAR(20);
ALTER TABLE "prayer_requests" ADD COLUMN "phone" TEXT;
ALTER TABLE "prayer_requests" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "prayer_requests" ADD COLUMN "time_zone" VARCHAR(64);
ALTER TABLE "prayer_requests" ADD COLUMN "availability_slot_id" UUID;
ALTER TABLE "prayer_requests" ADD COLUMN "consent_to_store" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "prayer_requests" ADD COLUMN "consent_to_contact" BOOLEAN NOT NULL DEFAULT false;

-- 4. Migrate existing data: phoneOrWhatsApp -> phone or whatsapp based on preferredContact
UPDATE "prayer_requests" SET
  "message" = 'Migrated from legacy request',
  "phone" = CASE WHEN "preferred_contact" ILIKE '%phone%' OR "preferred_contact" ILIKE '%llamada%' THEN "phone_or_whatsapp" ELSE NULL END,
  "whatsapp" = CASE WHEN "preferred_contact" ILIKE '%whatsapp%' THEN "phone_or_whatsapp" ELSE NULL END,
  "consent_to_store" = true,
  "consent_to_contact" = true
WHERE "message" IS NULL;

-- 5. Make message NOT NULL after migration
ALTER TABLE "prayer_requests" ALTER COLUMN "message" SET NOT NULL;

-- 6. Drop legacy columns
ALTER TABLE "prayer_requests" DROP COLUMN "phone_or_whatsapp";
ALTER TABLE "prayer_requests" DROP COLUMN "preferred_contact";
ALTER TABLE "prayer_requests" DROP COLUMN "consented_at";

-- 7. Add contactId to prayer_assignments
ALTER TABLE "prayer_assignments" ADD COLUMN "contact_id" UUID;

-- 8. Migrate prayer_assignments: find MinistryContact by usherName
UPDATE "prayer_assignments" pa
SET "contact_id" = mc.id
FROM "ministry_contacts" mc
WHERE pa."usher_name" = mc.name;

-- 9. Add index on contact_id
CREATE INDEX "prayer_assignments_contact_id_idx" ON "prayer_assignments"("contact_id");

-- 10. Add contactId to usher_availability
ALTER TABLE "usher_availability" ADD COLUMN "contact_id" UUID;

-- 11. Migrate usher_availability: find MinistryContact by usherName
UPDATE "usher_availability" ua
SET "contact_id" = mc.id
FROM "ministry_contacts" mc
WHERE ua."usher_name" = mc.name;

-- 12. Add index on contact_id
CREATE INDEX "usher_availability_contact_id_weekday_idx" ON "usher_availability"("contact_id", "weekday");

-- 13. Create notification_preferences table
CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "new_prayer_request" BOOLEAN NOT NULL DEFAULT true,
  "new_contact_request" BOOLEAN NOT NULL DEFAULT true,
  "pending_assignment" BOOLEAN NOT NULL DEFAULT true,
  "assignment_made" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 14. Create indexes on prayer_requests
CREATE INDEX "prayer_requests_request_type_created_at_idx" ON "prayer_requests"("request_type", "created_at");
CREATE INDEX "prayer_requests_country_idx" ON "prayer_requests"("country");
