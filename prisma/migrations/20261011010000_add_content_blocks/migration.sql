CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TABLE "content_blocks" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "key" TEXT NOT NULL, "type" TEXT NOT NULL, "display_order" INTEGER NOT NULL DEFAULT 0, "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id"));
CREATE TABLE "content_translations" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "block_id" UUID NOT NULL, "locale" VARCHAR(5) NOT NULL, "content" JSONB NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "content_translations_pkey" PRIMARY KEY ("id"));
CREATE TABLE "content_revisions" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "block_id" UUID NOT NULL, "snapshot" JSONB NOT NULL, "created_by_id" TEXT, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "content_blocks_key_key" ON "content_blocks"("key");
CREATE UNIQUE INDEX "content_translations_block_id_locale_key" ON "content_translations"("block_id", "locale");
CREATE INDEX "content_revisions_block_id_created_at_idx" ON "content_revisions"("block_id", "created_at");
ALTER TABLE "content_translations" ADD CONSTRAINT "content_translations_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
