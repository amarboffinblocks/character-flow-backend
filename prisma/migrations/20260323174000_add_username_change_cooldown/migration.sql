-- Add timestamp to enforce username change cooldown window
ALTER TABLE "users"
ADD COLUMN "username_changed_at" TIMESTAMP(3);
