-- Public visit analytics: flag pipeline-clean public events.
-- New events are written with is_public = true only after passing the
-- server-side gates (public path, no bots, no authenticated sessions).
-- Historical /admin, /api and /invite events are marked not public so
-- reports exclude them. No rows are deleted; historical public visits
-- keep is_public = true and remain reportable.

ALTER TABLE "analytics_events" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;

UPDATE "analytics_events"
SET "is_public" = false
WHERE path = '/admin' OR path LIKE '/admin/%'
   OR path ~ '^/(en|es|pt|ko|de)/admin(/|$)'
   OR path = '/api' OR path LIKE '/api/%'
   OR path = '/invite' OR path LIKE '/invite/%';

CREATE INDEX "analytics_events_is_public_occurred_at_idx"
  ON "analytics_events"("is_public", "occurred_at");
