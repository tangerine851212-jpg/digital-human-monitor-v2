-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('ADMIN', 'CAREGIVER', 'CARING');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ContentVisibility" AS ENUM ('ELDER_ONLY', 'FAMILY_ONLY', 'FAMILY_AND_ELDER');

-- CreateEnum
CREATE TYPE "MemoPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'PINNED');

-- CreateEnum
CREATE TYPE "CareTaskStatus" AS ENUM ('OPEN', 'CLAIMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MedicationSource" AS ENUM ('PRESCRIPTION', 'PACKAGE_LABEL', 'FAMILY_ENTRY');

-- CreateEnum
CREATE TYPE "MedicationDoseStatus" AS ENUM ('SCHEDULED', 'REMINDING', 'TAKEN', 'SNOOZED', 'SKIPPED', 'MISSED', 'NEEDS_FAMILY_CONFIRMATION');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'SAFE', 'NEEDS_CONTACT', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'BLUE');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "ElderDevice" ADD COLUMN     "deviceTokenHash" TEXT;

-- CreateTable
CREATE TABLE "ElderProfile" (
    "id" TEXT NOT NULL,
    "elderDeviceId" TEXT NOT NULL,
    "preferredName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyCircle" (
    "id" TEXT NOT NULL,
    "elderProfileId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyCircle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyInvitation" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "FamilyRole" NOT NULL DEFAULT 'CARING',
    "relationLabel" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMembership" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "role" "FamilyRole" NOT NULL DEFAULT 'CARING',
    "relationLabel" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "emergencyPush" BOOLEAN NOT NULL DEFAULT true,
    "routinePush" BOOLEAN NOT NULL DEFAULT true,
    "dutyOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyPost" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'FAMILY_AND_ELDER',
    "elderAuthored" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMemo" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "MemoPriority" NOT NULL DEFAULT 'NORMAL',
    "visibility" "ContentVisibility" NOT NULL DEFAULT 'FAMILY_AND_ELDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTask" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "CareTaskStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationPlan" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "instructions" TEXT,
    "timesJson" TEXT NOT NULL,
    "source" "MedicationSource" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "stockCount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pausedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationDose" (
    "id" TEXT NOT NULL,
    "medicationPlanId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "MedicationDoseStatus" NOT NULL DEFAULT 'SCHEDULED',
    "respondedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInRequest" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "prompt" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "responseText" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetySignal" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "contextText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyAlert" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "safetySignalId" TEXT NOT NULL,
    "claimedById" TEXT,
    "level" "AlertLevel" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "resolutionNote" TEXT,
    "claimedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMemory" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentSetting" (
    "id" TEXT NOT NULL,
    "elderProfileId" TEXT NOT NULL,
    "shareTranscripts" BOOLEAN NOT NULL DEFAULT true,
    "shareRawAudio" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "detailJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElderProfile_elderDeviceId_key" ON "ElderProfile"("elderDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyCircle_elderProfileId_key" ON "FamilyCircle"("elderProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyInvitation_tokenHash_key" ON "FamilyInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "FamilyInvitation_familyCircleId_status_expiresAt_idx" ON "FamilyInvitation"("familyCircleId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "FamilyMembership_caregiverId_status_idx" ON "FamilyMembership"("caregiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMembership_familyCircleId_caregiverId_key" ON "FamilyMembership"("familyCircleId", "caregiverId");

-- CreateIndex
CREATE INDEX "FamilyPost_familyCircleId_createdAt_idx" ON "FamilyPost"("familyCircleId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FamilyMemo_familyCircleId_priority_updatedAt_idx" ON "FamilyMemo"("familyCircleId", "priority", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "CareTask_familyCircleId_status_dueAt_idx" ON "CareTask"("familyCircleId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "MedicationPlan_familyCircleId_active_idx" ON "MedicationPlan"("familyCircleId", "active");

-- CreateIndex
CREATE INDEX "MedicationDose_scheduledFor_status_idx" ON "MedicationDose"("scheduledFor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationDose_medicationPlanId_scheduledFor_key" ON "MedicationDose"("medicationPlanId", "scheduledFor");

-- CreateIndex
CREATE INDEX "CheckInRequest_familyCircleId_status_createdAt_idx" ON "CheckInRequest"("familyCircleId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SafetySignal_familyCircleId_category_createdAt_idx" ON "SafetySignal"("familyCircleId", "category", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SafetyAlert_safetySignalId_key" ON "SafetyAlert"("safetySignalId");

-- CreateIndex
CREATE INDEX "SafetyAlert_familyCircleId_status_createdAt_idx" ON "SafetyAlert"("familyCircleId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentSetting_elderProfileId_key" ON "ConsentSetting"("elderProfileId");

-- CreateIndex
CREATE INDEX "AuditLog_familyCircleId_createdAt_idx" ON "AuditLog"("familyCircleId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ElderProfile" ADD CONSTRAINT "ElderProfile_elderDeviceId_fkey" FOREIGN KEY ("elderDeviceId") REFERENCES "ElderDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyCircle" ADD CONSTRAINT "FamilyCircle_elderProfileId_fkey" FOREIGN KEY ("elderProfileId") REFERENCES "ElderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyCircle" ADD CONSTRAINT "FamilyCircle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CaregiverAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CaregiverAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyPost" ADD CONSTRAINT "FamilyPost_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyPost" ADD CONSTRAINT "FamilyPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CaregiverAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMemo" ADD CONSTRAINT "FamilyMemo_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMemo" ADD CONSTRAINT "FamilyMemo_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CaregiverAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CaregiverAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "CaregiverAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPlan" ADD CONSTRAINT "MedicationPlan_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPlan" ADD CONSTRAINT "MedicationPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CaregiverAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationDose" ADD CONSTRAINT "MedicationDose_medicationPlanId_fkey" FOREIGN KEY ("medicationPlanId") REFERENCES "MedicationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInRequest" ADD CONSTRAINT "CheckInRequest_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInRequest" ADD CONSTRAINT "CheckInRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "CaregiverAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetySignal" ADD CONSTRAINT "SafetySignal_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAlert" ADD CONSTRAINT "SafetyAlert_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAlert" ADD CONSTRAINT "SafetyAlert_safetySignalId_fkey" FOREIGN KEY ("safetySignalId") REFERENCES "SafetySignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAlert" ADD CONSTRAINT "SafetyAlert_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "CaregiverAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMemory" ADD CONSTRAINT "FamilyMemory_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentSetting" ADD CONSTRAINT "ConsentSetting_elderProfileId_fkey" FOREIGN KEY ("elderProfileId") REFERENCES "ElderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "CaregiverAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
