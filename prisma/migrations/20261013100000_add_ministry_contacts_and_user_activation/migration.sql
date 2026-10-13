ALTER TABLE "user" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "ministry_contacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "ministry" TEXT NOT NULL,
  "phone" TEXT,
  "whatsapp" TEXT,
  "telegram_chat_id" TEXT,
  "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
  "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  "authorized" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ministry_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ministry_contacts_ministry_idx" ON "ministry_contacts"("ministry");
