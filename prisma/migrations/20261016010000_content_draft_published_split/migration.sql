-- Editorial workflow correction: separate working drafts from the published
-- version. Saving a draft must never alter what visitors see.
-- Safe reshape without deleting any row:
--   1. The existing "content" column becomes "draft" (rename, no data loss).
--   2. A nullable "published" column is added.
--   3. Blocks currently PUBLISHED keep their live version by copying the
--      existing content into "published"; every other row starts unpublished
--      with its draft intact. Restoring or republishing is an explicit,
--      audited action, never an automatic backfill.

ALTER TABLE "content_translations" RENAME COLUMN "content" TO "draft";
ALTER TABLE "content_translations" ADD COLUMN "published" JSONB;

UPDATE "content_translations" AS t
SET "published" = t."draft"
FROM "content_blocks" AS b
WHERE t."block_id" = b."id" AND b."status" = 'PUBLISHED';
