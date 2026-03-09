/*
  Warnings:

  - You are about to drop the column `api_key` on the `models` table. All the data in the column will be lost.
  - You are about to drop the column `base_url` on the `models` table. All the data in the column will be lost.
  - You are about to drop the column `endpoint` on the `models` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `models` table. All the data in the column will be lost.
  - The `provider` column on the `models` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('openai', 'gemini', 'aws', 'anthropic', 'local');

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "models" DROP COLUMN "api_key",
DROP COLUMN "base_url",
DROP COLUMN "endpoint",
DROP COLUMN "region",
DROP COLUMN "provider",
ADD COLUMN     "provider" "ModelProvider" NOT NULL DEFAULT 'aws';

-- CreateIndex
CREATE INDEX "chats_model_id_idx" ON "chats"("model_id");
