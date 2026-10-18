-- Additive CMS media registry: records normalized uploads served from an
-- external, env-configured directory. No existing table or row is altered.
CREATE TABLE "content_media" (
  "id" UUID NOT NULL,
  "filename" TEXT NOT NULL,
  "mime_type" VARCHAR(32) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "created_by_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_media_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_media_filename_key" ON "content_media"("filename");
CREATE INDEX "content_media_created_by_id_idx" ON "content_media"("created_by_id");
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
