-- Editorial content workflow: revision language/action tracking plus the fixed
-- block catalog. Existing rows are preserved; new columns stay nullable for
-- legacy revisions, while all new revisions record locale and action.

ALTER TABLE "content_revisions" ADD COLUMN "locale" VARCHAR(5);
ALTER TABLE "content_revisions" ADD COLUMN "action" TEXT;

INSERT INTO "content_blocks" ("id", "key", "type", "display_order", "status")
VALUES
  (gen_random_uuid(), 'home.hero', 'hero', 10, 'DRAFT'),
  (gen_random_uuid(), 'home.live', 'section', 20, 'DRAFT'),
  (gen_random_uuid(), 'home.community', 'section', 30, 'DRAFT'),
  (gen_random_uuid(), 'home.about', 'section', 40, 'DRAFT'),
  (gen_random_uuid(), 'home.contact', 'section', 50, 'DRAFT'),
  (gen_random_uuid(), 'home.vision', 'section', 60, 'DRAFT'),
  (gen_random_uuid(), 'pastors.intro', 'section', 70, 'DRAFT'),
  (gen_random_uuid(), 'site.footer', 'section', 80, 'DRAFT')
ON CONFLICT ("key") DO NOTHING;
