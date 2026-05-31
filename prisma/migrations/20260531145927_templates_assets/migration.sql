-- AlterTable
ALTER TABLE "ReplyDraft" ADD COLUMN "attachments" TEXT;
ALTER TABLE "ReplyDraft" ADD COLUMN "templateId" TEXT;

-- CreateTable
CREATE TABLE "ReplyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inquiryType" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL DEFAULT 'en',
    "draftTarget" TEXT NOT NULL,
    "draftZh" TEXT NOT NULL,
    "attachAssetIds" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ReplyTemplate_inquiryType_targetLang_idx" ON "ReplyTemplate"("inquiryType", "targetLang");

-- CreateIndex
CREATE INDEX "MediaAsset_category_idx" ON "MediaAsset"("category");
