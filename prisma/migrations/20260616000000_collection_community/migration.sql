-- Phase 7: Collection Community — Voting + Analytics

-- Extra indexes on Collection
CREATE INDEX "Collection_isPublic_updatedAt_idx" ON "Collection"("isPublic", "updatedAt" DESC);

-- CollectionVote
CREATE TABLE "CollectionVote" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "voteType"     TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CollectionVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollectionVote_userId_collectionId_key" ON "CollectionVote"("userId", "collectionId");
CREATE INDEX "CollectionVote_collectionId_idx"              ON "CollectionVote"("collectionId");
CREATE INDEX "CollectionVote_userId_idx"                    ON "CollectionVote"("userId");

ALTER TABLE "CollectionVote"
    ADD CONSTRAINT "CollectionVote_userId_fkey"
        FOREIGN KEY ("userId")       REFERENCES "User"("id")       ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionVote"
    ADD CONSTRAINT "CollectionVote_collectionId_fkey"
        FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CollectionAnalytics
CREATE TABLE "CollectionAnalytics" (
    "collectionId"    TEXT             NOT NULL,
    "views"           INTEGER          NOT NULL DEFAULT 0,
    "saves"           INTEGER          NOT NULL DEFAULT 0,
    "upvotes"         INTEGER          NOT NULL DEFAULT 0,
    "downvotes"       INTEGER          NOT NULL DEFAULT 0,
    "score"           INTEGER          NOT NULL DEFAULT 0,
    "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "CollectionAnalytics_pkey" PRIMARY KEY ("collectionId")
);

CREATE INDEX "CollectionAnalytics_score_idx"           ON "CollectionAnalytics"("score"           DESC);
CREATE INDEX "CollectionAnalytics_upvotes_idx"         ON "CollectionAnalytics"("upvotes"         DESC);
CREATE INDEX "CollectionAnalytics_popularityScore_idx" ON "CollectionAnalytics"("popularityScore" DESC);

ALTER TABLE "CollectionAnalytics"
    ADD CONSTRAINT "CollectionAnalytics_collectionId_fkey"
        FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
