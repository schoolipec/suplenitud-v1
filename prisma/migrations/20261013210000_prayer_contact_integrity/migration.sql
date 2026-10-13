-- Prayer contact integrity fixes
-- 1. Foreign keys declared by the Prisma schema that the first migration omitted.
-- 2. Legacy consent correction: the first migration set consent_to_contact = true
--    for every inherited row, but the separate contact-consent wording did not exist
--    when those rows were created. Contact consent must not be assumed.
--    Decision: inherited rows keep their stored data as historical record with
--    consent_to_contact = false. Rows still NEW with the placeholder message
--    (no real petition text) move to PENDING_ASSIGNMENT for manual review.
--    No contact may be made from these rows without fresh explicit consent.
-- 3. Internal panel notification table (panel-only alerts, no external channels).

-- 1a. prayer_assignments.contact_id -> ministry_contacts(id), SET NULL on delete.
ALTER TABLE "prayer_assignments"
  ADD CONSTRAINT "prayer_assignments_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "ministry_contacts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 1b. usher_availability.contact_id -> ministry_contacts(id), CASCADE on delete.
ALTER TABLE "usher_availability"
  ADD CONSTRAINT "usher_availability_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "ministry_contacts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 1c. prayer_requests.availability_slot_id -> usher_availability(id), SET NULL on delete.
ALTER TABLE "prayer_requests"
  ADD CONSTRAINT "prayer_requests_availability_slot_id_fkey"
  FOREIGN KEY ("availability_slot_id") REFERENCES "usher_availability"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2a. Never assume contact consent for inherited rows.
UPDATE "prayer_requests"
SET "consent_to_contact" = false
WHERE "message" = 'Migrated from legacy request'
  AND "consent_to_contact" = true;

-- 2b. Inherited rows without a real petition text stay out of the NEW queue
-- for manual review instead of auto-flowing as authorized contact requests.
UPDATE "prayer_requests"
SET "status" = 'PENDING_ASSIGNMENT'
WHERE "message" = 'Migrated from legacy request'
  AND "status" = 'NEW';

-- 3. Internal notification types and table.
CREATE TYPE "PrayerNotificationType" AS ENUM (
  'NEW_PRAYER_REQUEST',
  'NEW_CONTACT_REQUEST',
  'PENDING_ASSIGNMENT',
  'ASSIGNMENT_MADE'
);

CREATE TABLE "prayer_notifications" (
  "id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "PrayerNotificationType" NOT NULL,
  "request_id" UUID,
  "title" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prayer_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prayer_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prayer_notifications_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "prayer_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "prayer_notifications_user_id_read_created_at_idx"
  ON "prayer_notifications"("user_id", "read", "created_at");
