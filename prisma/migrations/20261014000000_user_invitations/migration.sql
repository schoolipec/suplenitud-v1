-- User invitations for passwordless onboarding.
-- Accounts are created without credentials; the invitee sets their own
-- password through a single-use hashed token valid for 24 hours.
-- Existing users are preserved: no backfill, no credential changes.

CREATE TABLE "user_invitations" (
  "id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(6) NOT NULL,
  "used_at" TIMESTAMP(6),
  "revoked_at" TIMESTAMP(6),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_invitations_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "user_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_invitations_user_id_idx" ON "user_invitations"("user_id");
