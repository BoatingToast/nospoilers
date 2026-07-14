CREATE TABLE "ImportBatch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'previewed',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "matchedRows" INTEGER NOT NULL DEFAULT 0,
  "conflictRows" INTEGER NOT NULL DEFAULT 0,
  "unmatchedRows" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB,
  "summary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportBatch_userId_createdAt_idx"
ON "ImportBatch"("userId", "createdAt" DESC);

CREATE INDEX "ImportBatch_userId_status_idx"
ON "ImportBatch"("userId", "status");

ALTER TABLE "ImportBatch"
ADD CONSTRAINT "ImportBatch_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
