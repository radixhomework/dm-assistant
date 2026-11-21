ALTER TABLE "users" ADD COLUMN "username" text;
-- Backfill the login names from the email local parts, then enforce.
UPDATE "users" SET "username" = split_part(split_part("email", '@', 1), '+', 1) WHERE "username" IS NULL;
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_uq" ON "users" ("username");
