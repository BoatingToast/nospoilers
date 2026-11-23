-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AudienceProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1200) NOT NULL,
    "mediaType" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
    "discoverable" BOOLEAN NOT NULL DEFAULT false,
    "rightsNote" VARCHAR(600) NOT NULL,
    "rightsConfirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetFacets" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'explicit-fit-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceVariant" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "headline" VARCHAR(180) NOT NULL,
    "concept" VARCHAR(5000) NOT NULL,
    "uploadId" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AudienceVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceParticipant" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "assignmentProbability" DOUBLE PRECISION NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reuseConsent" BOOLEAN NOT NULL DEFAULT false,
    "facets" JSONB NOT NULL,
    "primaryInterest" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "fitBand" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "exposedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "interestedAt" TIMESTAMP(3),
    "feedbackAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "intent" INTEGER,
    "expectation" INTEGER,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" VARCHAR(600) NOT NULL DEFAULT '',
    "quality" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" VARCHAR(600) NOT NULL DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "AudienceParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceEvent" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventKey" VARCHAR(80) NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "payload" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudienceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceDataset" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdById" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "modelVersion" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "trainCount" INTEGER NOT NULL,
    "evaluationCount" INTEGER NOT NULL,
    "participantIds" TEXT[],
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedAt" TIMESTAMP(3),

    CONSTRAINT "AudienceDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(128) NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudienceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AudienceProject_shareCode_key" ON "AudienceProject"("shareCode");

-- CreateIndex
CREATE INDEX "AudienceProject_ownerId_createdAt_idx" ON "AudienceProject"("ownerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AudienceProject_status_discoverable_createdAt_idx" ON "AudienceProject"("status", "discoverable", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AudienceVariant_projectId_position_key" ON "AudienceVariant"("projectId", "position");

-- CreateIndex
CREATE INDEX "AudienceParticipant_projectId_variantId_idx" ON "AudienceParticipant"("projectId", "variantId");

-- CreateIndex
CREATE INDEX "AudienceParticipant_quality_reuseConsent_feedbackAt_idx" ON "AudienceParticipant"("quality", "reuseConsent", "feedbackAt");

-- CreateIndex
CREATE INDEX "AudienceParticipant_userId_consentedAt_idx" ON "AudienceParticipant"("userId", "consentedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AudienceParticipant_projectId_userId_key" ON "AudienceParticipant"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AudienceParticipant_id_projectId_key" ON "AudienceParticipant"("id", "projectId");

-- CreateIndex
CREATE INDEX "AudienceEvent_projectId_createdAt_idx" ON "AudienceEvent"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AudienceEvent_createdAt_id_idx" ON "AudienceEvent"("createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "AudienceEvent_type_createdAt_idx" ON "AudienceEvent"("type", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AudienceEvent_participantId_eventKey_key" ON "AudienceEvent"("participantId", "eventKey");

-- CreateIndex
CREATE INDEX "AudienceDataset_createdAt_idx" ON "AudienceDataset"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AudienceAudit_createdAt_idx" ON "AudienceAudit"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AudienceProject" ADD CONSTRAINT "AudienceProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceVariant" ADD CONSTRAINT "AudienceVariant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AudienceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceVariant" ADD CONSTRAINT "AudienceVariant_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "UploadedMovie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceParticipant" ADD CONSTRAINT "AudienceParticipant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AudienceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceParticipant" ADD CONSTRAINT "AudienceParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceParticipant" ADD CONSTRAINT "AudienceParticipant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "AudienceVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceEvent" ADD CONSTRAINT "AudienceEvent_participantId_projectId_fkey" FOREIGN KEY ("participantId", "projectId") REFERENCES "AudienceParticipant"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceDataset" ADD CONSTRAINT "AudienceDataset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceAudit" ADD CONSTRAINT "AudienceAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Grant only the existing owner account. New registrations default to false.
UPDATE "User" SET "isAdmin" = true WHERE lower(trim("email")) = 'emoon0108@gmail.com';

