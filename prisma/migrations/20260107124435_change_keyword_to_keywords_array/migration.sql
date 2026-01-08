/*
  Warnings:

  - You are about to drop the column `keyword` on the `lorebook_entries` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "lorebook_entries_keyword_idx";

-- AlterTable
ALTER TABLE "lorebook_entries" DROP COLUMN "keyword",
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
