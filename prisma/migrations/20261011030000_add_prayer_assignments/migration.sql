CREATE TABLE "prayer_assignments" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "request_id" UUID NOT NULL, "usher_name" TEXT NOT NULL, "assigned_by_id" TEXT NOT NULL, "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "prayer_assignments_pkey" PRIMARY KEY ("id"));
CREATE INDEX "prayer_assignments_request_id_idx" ON "prayer_assignments"("request_id");
ALTER TABLE "prayer_assignments" ADD CONSTRAINT "prayer_assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "prayer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
