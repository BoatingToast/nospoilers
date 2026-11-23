CREATE TABLE "AudienceWork" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "workKey" VARCHAR(120) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "mediaType" VARCHAR(16) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AudienceWork_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AudienceWork_ownerId_mediaType_workKey_key" ON "AudienceWork"("ownerId", "mediaType", "workKey");
ALTER TABLE "AudienceWork" ADD CONSTRAINT "AudienceWork_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AudienceProject" ADD COLUMN "workId" TEXT;
-- Historical identities remain distinct; never silently merge titles by name.
INSERT INTO "AudienceWork" ("id", "ownerId", "workKey", "title", "mediaType", "createdAt")
SELECT "id", "ownerId", 'legacy:' || "id", "title", "mediaType", "createdAt" FROM "AudienceProject";
UPDATE "AudienceProject" SET "workId" = "id";
ALTER TABLE "AudienceProject" ALTER COLUMN "workId" SET NOT NULL;
CREATE INDEX "AudienceProject_workId_idx" ON "AudienceProject"("workId");
ALTER TABLE "AudienceProject" ADD CONSTRAINT "AudienceProject_workId_fkey" FOREIGN KEY ("workId") REFERENCES "AudienceWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The holdout identity now spans studies. Old frozen versions must be rebuilt.
-- Preserve historical payloads for auditing; no consent was withdrawn here.
UPDATE "AudienceDataset" SET "invalidatedAt" = CURRENT_TIMESTAMP WHERE "invalidatedAt" IS NULL;
ALTER TABLE "AudienceDataset" ALTER COLUMN "schemaVersion" SET DEFAULT 2;
