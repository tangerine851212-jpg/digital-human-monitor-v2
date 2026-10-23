/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `CaregiverAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CaregiverAccount" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "CaregiverSession" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverSession_sessionToken_key" ON "CaregiverSession"("sessionToken");

-- CreateIndex
CREATE INDEX "CaregiverSession_caregiverId_updatedAt_idx" ON "CaregiverSession"("caregiverId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverAccount_username_key" ON "CaregiverAccount"("username");

-- MigrateData
INSERT INTO "CaregiverSession" (
  "id",
  "caregiverId",
  "sessionToken",
  "lastSeenAt",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('legacy_', md5("id" || ':' || "sessionToken")),
  "id",
  "sessionToken",
  NOW(),
  NOW(),
  NOW()
FROM "CaregiverAccount"
WHERE "sessionToken" IS NOT NULL;

-- DropIndex
DROP INDEX "CaregiverAccount_sessionToken_key";

-- AlterTable
ALTER TABLE "CaregiverAccount" DROP COLUMN "sessionToken";

-- AddForeignKey
ALTER TABLE "CaregiverSession" ADD CONSTRAINT "CaregiverSession_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
