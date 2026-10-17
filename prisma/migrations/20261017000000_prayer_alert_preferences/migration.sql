-- Prayer alert preferences: per-user opt-in switches for external delivery.
-- Additive only; existing users keep all current data and both flags default off.

ALTER TABLE "user" ADD COLUMN "prayer_telegram_alerts_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "prayer_email_copies_enabled" BOOLEAN NOT NULL DEFAULT false;
