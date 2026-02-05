-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'aws',
    "base_url" TEXT,
    "api_key" TEXT,
    "model_name" TEXT,
    "region" TEXT,
    "endpoint" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "models_slug_key" ON "models"("slug");

-- CreateIndex
CREATE INDEX "models_slug_idx" ON "models"("slug");

-- CreateIndex
CREATE INDEX "models_is_active_idx" ON "models"("is_active");

-- CreateIndex
CREATE INDEX "models_is_default_idx" ON "models"("is_default");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
