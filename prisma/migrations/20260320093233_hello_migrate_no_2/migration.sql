-- CreateTable
CREATE TABLE "persona_favorites" (
    "user_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_favorites_pkey" PRIMARY KEY ("user_id","persona_id")
);

-- CreateTable
CREATE TABLE "persona_saved" (
    "user_id" TEXT NOT NULL,
    "persona_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_saved_pkey" PRIMARY KEY ("user_id","persona_id")
);

-- CreateTable
CREATE TABLE "lorebook_favorites" (
    "user_id" TEXT NOT NULL,
    "lorebook_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lorebook_favorites_pkey" PRIMARY KEY ("user_id","lorebook_id")
);

-- CreateTable
CREATE TABLE "lorebook_saved" (
    "user_id" TEXT NOT NULL,
    "lorebook_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lorebook_saved_pkey" PRIMARY KEY ("user_id","lorebook_id")
);

-- CreateIndex
CREATE INDEX "persona_favorites_persona_id_idx" ON "persona_favorites"("persona_id");

-- CreateIndex
CREATE INDEX "persona_saved_persona_id_idx" ON "persona_saved"("persona_id");

-- CreateIndex
CREATE INDEX "lorebook_favorites_lorebook_id_idx" ON "lorebook_favorites"("lorebook_id");

-- CreateIndex
CREATE INDEX "lorebook_saved_lorebook_id_idx" ON "lorebook_saved"("lorebook_id");

-- AddForeignKey
ALTER TABLE "persona_favorites" ADD CONSTRAINT "persona_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_favorites" ADD CONSTRAINT "persona_favorites_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_saved" ADD CONSTRAINT "persona_saved_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_saved" ADD CONSTRAINT "persona_saved_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lorebook_favorites" ADD CONSTRAINT "lorebook_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lorebook_favorites" ADD CONSTRAINT "lorebook_favorites_lorebook_id_fkey" FOREIGN KEY ("lorebook_id") REFERENCES "lorebooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lorebook_saved" ADD CONSTRAINT "lorebook_saved_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lorebook_saved" ADD CONSTRAINT "lorebook_saved_lorebook_id_fkey" FOREIGN KEY ("lorebook_id") REFERENCES "lorebooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
