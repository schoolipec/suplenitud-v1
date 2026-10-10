CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "blessing_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "blessing_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blessing_message_translations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL,
  "locale" VARCHAR(5) NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "scripture_reference" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "blessing_message_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "session_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "locale" VARCHAR(5) NOT NULL,
  "country_code" VARCHAR(2),
  "country_name" TEXT,
  "region_code" VARCHAR(2),
  "region_name" TEXT,
  "city" TEXT,
  "referrer" TEXT,
  "user_agent_family" TEXT,
  "device_type" TEXT,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscribers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "locale" VARCHAR(5) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "subscribed_at" TIMESTAMPTZ(6),
  "unsubscribed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blessing_message_translations_message_id_locale_key" ON "blessing_message_translations"("message_id", "locale");
CREATE INDEX "analytics_events_occurred_at_idx" ON "analytics_events"("occurred_at");
CREATE INDEX "analytics_events_locale_idx" ON "analytics_events"("locale");
CREATE UNIQUE INDEX "subscribers_email_key" ON "subscribers"("email");

ALTER TABLE "blessing_message_translations" ADD CONSTRAINT "blessing_message_translations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "blessing_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
