-- CreateTable
CREATE TABLE "MovieRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT,
    "releaseDate" TEXT,
    "score" INTEGER NOT NULL,
    "storytelling" INTEGER,
    "characters" INTEGER,
    "entertainment" INTEGER,
    "emotion" INTEGER,
    "complexity" INTEGER,
    "suspense" INTEGER,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovieRating_userId_score_idx" ON "MovieRating"("userId", "score" DESC);

-- CreateIndex
CREATE INDEX "MovieRating_userId_createdAt_idx" ON "MovieRating"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MovieRating_tmdbId_idx" ON "MovieRating"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieRating_userId_tmdbId_key" ON "MovieRating"("userId", "tmdbId");

-- AddForeignKey
ALTER TABLE "MovieRating" ADD CONSTRAINT "MovieRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
