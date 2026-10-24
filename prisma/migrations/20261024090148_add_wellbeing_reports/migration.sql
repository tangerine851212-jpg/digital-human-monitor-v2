-- CreateTable
CREATE TABLE "WellbeingReport" (
    "id" TEXT NOT NULL,
    "elderDeviceId" TEXT NOT NULL,
    "familyCircleId" TEXT NOT NULL,
    "generatedById" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "contentJson" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "sourceTurnCount" INTEGER NOT NULL DEFAULT 0,
    "userTurnCount" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WellbeingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WellbeingReport_elderDeviceId_createdAt_idx" ON "WellbeingReport"("elderDeviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WellbeingReport_familyCircleId_createdAt_idx" ON "WellbeingReport"("familyCircleId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WellbeingReport" ADD CONSTRAINT "WellbeingReport_elderDeviceId_fkey" FOREIGN KEY ("elderDeviceId") REFERENCES "ElderDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingReport" ADD CONSTRAINT "WellbeingReport_familyCircleId_fkey" FOREIGN KEY ("familyCircleId") REFERENCES "FamilyCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellbeingReport" ADD CONSTRAINT "WellbeingReport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "CaregiverAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
