/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `FamilyMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FamilyMessage" ADD COLUMN     "publicId" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expirationTime" TIMESTAMP(3),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_caregiverId_updatedAt_idx" ON "PushSubscription"("caregiverId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMessage_publicId_key" ON "FamilyMessage"("publicId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
