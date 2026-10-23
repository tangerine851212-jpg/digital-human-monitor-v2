-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('ELDER_TO_FAMILY', 'FAMILY_TO_ELDER');

-- CreateEnum
CREATE TYPE "MessageImportance" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('APP_OPEN', 'SETTINGS_OPENED', 'AI_SESSION_STARTED', 'AI_SESSION_ENDED', 'CAMERA_ENABLED', 'CAMERA_DISABLED', 'TOOL_CALLED');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "CaregiverAccount" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElderDevice" (
    "id" TEXT NOT NULL,
    "deviceUuid" TEXT NOT NULL,
    "displayName" TEXT,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElderDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceBinding" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "elderDeviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMessage" (
    "id" TEXT NOT NULL,
    "elderDeviceId" TEXT NOT NULL,
    "caregiverId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "content" TEXT NOT NULL,
    "recipientRelation" TEXT,
    "importance" "MessageImportance" NOT NULL DEFAULT 'NORMAL',
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "FamilyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTurn" (
    "id" TEXT NOT NULL,
    "elderDeviceId" TEXT NOT NULL,
    "sessionId" TEXT,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "elderDeviceId" TEXT NOT NULL,
    "eventType" "UsageEventType" NOT NULL,
    "detailJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolCallLog" (
    "id" TEXT NOT NULL,
    "elderDeviceId" TEXT NOT NULL,
    "sessionId" TEXT,
    "callId" TEXT,
    "toolName" TEXT NOT NULL,
    "argumentsJson" TEXT NOT NULL,
    "outputText" TEXT,
    "status" "ToolCallStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverAccount_sessionToken_key" ON "CaregiverAccount"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "ElderDevice_deviceUuid_key" ON "ElderDevice"("deviceUuid");

-- CreateIndex
CREATE INDEX "DeviceBinding_elderDeviceId_createdAt_idx" ON "DeviceBinding"("elderDeviceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceBinding_caregiverId_elderDeviceId_key" ON "DeviceBinding"("caregiverId", "elderDeviceId");

-- CreateIndex
CREATE INDEX "FamilyMessage_elderDeviceId_createdAt_idx" ON "FamilyMessage"("elderDeviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FamilyMessage_direction_status_createdAt_idx" ON "FamilyMessage"("direction", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ConversationTurn_elderDeviceId_createdAt_idx" ON "ConversationTurn"("elderDeviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ConversationTurn_sessionId_createdAt_idx" ON "ConversationTurn"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_elderDeviceId_createdAt_idx" ON "UsageEvent"("elderDeviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UsageEvent_eventType_createdAt_idx" ON "UsageEvent"("eventType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ToolCallLog_elderDeviceId_createdAt_idx" ON "ToolCallLog"("elderDeviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ToolCallLog_toolName_createdAt_idx" ON "ToolCallLog"("toolName", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "DeviceBinding" ADD CONSTRAINT "DeviceBinding_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceBinding" ADD CONSTRAINT "DeviceBinding_elderDeviceId_fkey" FOREIGN KEY ("elderDeviceId") REFERENCES "ElderDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMessage" ADD CONSTRAINT "FamilyMessage_elderDeviceId_fkey" FOREIGN KEY ("elderDeviceId") REFERENCES "ElderDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMessage" ADD CONSTRAINT "FamilyMessage_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_elderDeviceId_fkey" FOREIGN KEY ("elderDeviceId") REFERENCES "ElderDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_elderDeviceId_fkey" FOREIGN KEY ("elderDeviceId") REFERENCES "ElderDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCallLog" ADD CONSTRAINT "ToolCallLog_elderDeviceId_fkey" FOREIGN KEY ("elderDeviceId") REFERENCES "ElderDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
