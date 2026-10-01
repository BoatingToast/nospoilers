-- Where Was I? stores licensed/original story evidence by explicit progress
-- checkpoint. Viewer progress itself remains owned by WatchlistItem.
CREATE TABLE "ResumeTitle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "catalogId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "premise" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "rightsNote" TEXT NOT NULL,
    "totalSeasons" INTEGER,
    "totalEpisodes" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeTitle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeCheckpoint" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "season" INTEGER,
    "episode" INTEGER,
    "filmProgressPercent" INTEGER,
    "label" TEXT NOT NULL,
    "shortRecap" JSONB NOT NULL,
    "longRecap" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeEvidence" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "earliestCheckpointId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "characterKey" TEXT,
    "text" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "sourceExcerpt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeCharacter" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeCharacter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeCharacterSnapshot" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "viewerContext" JSONB NOT NULL,
    "relationships" JSONB NOT NULL,
    "characterKnowledge" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeCharacterSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeAnswerCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "questionHash" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "method" TEXT NOT NULL,
    "model" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostMicros" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeAnswerCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResumeTitle_slug_key" ON "ResumeTitle"("slug");
CREATE UNIQUE INDEX "ResumeTitle_catalogId_key" ON "ResumeTitle"("catalogId");
CREATE UNIQUE INDEX "ResumeCheckpoint_titleId_ordinal_key" ON "ResumeCheckpoint"("titleId", "ordinal");
CREATE UNIQUE INDEX "ResumeCheckpoint_titleId_season_episode_key" ON "ResumeCheckpoint"("titleId", "season", "episode");
CREATE INDEX "ResumeCheckpoint_titleId_filmProgressPercent_idx" ON "ResumeCheckpoint"("titleId", "filmProgressPercent");
CREATE INDEX "ResumeEvidence_titleId_earliestCheckpointId_idx" ON "ResumeEvidence"("titleId", "earliestCheckpointId");
CREATE INDEX "ResumeEvidence_titleId_characterKey_kind_idx" ON "ResumeEvidence"("titleId", "characterKey", "kind");
CREATE UNIQUE INDEX "ResumeCharacter_titleId_stableKey_key" ON "ResumeCharacter"("titleId", "stableKey");
CREATE INDEX "ResumeCharacter_titleId_idx" ON "ResumeCharacter"("titleId");
CREATE UNIQUE INDEX "ResumeCharacterSnapshot_characterId_checkpointId_key" ON "ResumeCharacterSnapshot"("characterId", "checkpointId");
CREATE INDEX "ResumeCharacterSnapshot_checkpointId_idx" ON "ResumeCharacterSnapshot"("checkpointId");
CREATE UNIQUE INDEX "ResumeAnswerCache_userId_titleId_checkpointId_sourceVersion_questionHash_key" ON "ResumeAnswerCache"("userId", "titleId", "checkpointId", "sourceVersion", "questionHash");
CREATE INDEX "ResumeAnswerCache_userId_titleId_createdAt_idx" ON "ResumeAnswerCache"("userId", "titleId", "createdAt" DESC);

ALTER TABLE "ResumeCheckpoint" ADD CONSTRAINT "ResumeCheckpoint_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "ResumeTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeEvidence" ADD CONSTRAINT "ResumeEvidence_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "ResumeTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeEvidence" ADD CONSTRAINT "ResumeEvidence_earliestCheckpointId_fkey" FOREIGN KEY ("earliestCheckpointId") REFERENCES "ResumeCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeCharacter" ADD CONSTRAINT "ResumeCharacter_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "ResumeTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeCharacterSnapshot" ADD CONSTRAINT "ResumeCharacterSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "ResumeCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeCharacterSnapshot" ADD CONSTRAINT "ResumeCharacterSnapshot_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "ResumeCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeAnswerCache" ADD CONSTRAINT "ResumeAnswerCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeAnswerCache" ADD CONSTRAINT "ResumeAnswerCache_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "ResumeTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeAnswerCache" ADD CONSTRAINT "ResumeAnswerCache_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "ResumeCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
