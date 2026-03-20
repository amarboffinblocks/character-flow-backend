/*
  Warnings:

  - You are about to drop the column `tokens` on the `personas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "personas" DROP COLUMN "tokens";

-- CreateTable
CREATE TABLE "character_favorites" (
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_favorites_pkey" PRIMARY KEY ("user_id","character_id")
);

-- CreateTable
CREATE TABLE "character_saved" (
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_saved_pkey" PRIMARY KEY ("user_id","character_id")
);

-- CreateIndex
CREATE INDEX "character_favorites_character_id_idx" ON "character_favorites"("character_id");

-- CreateIndex
CREATE INDEX "character_saved_character_id_idx" ON "character_saved"("character_id");

-- AddForeignKey
ALTER TABLE "character_favorites" ADD CONSTRAINT "character_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_favorites" ADD CONSTRAINT "character_favorites_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_saved" ADD CONSTRAINT "character_saved_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_saved" ADD CONSTRAINT "character_saved_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
