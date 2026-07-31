-- Save an automatic catalog match plus a merged, ordered provider list that is
-- ready to pass directly into the Reels UI. Creator links can supplement it.
ALTER TABLE "UploadedMovie"
ADD COLUMN "releaseYear" INTEGER,
ADD COLUMN "tmdbId" INTEGER,
ADD COLUMN "watchProviders" JSONB NOT NULL DEFAULT '[]'::JSONB,
ADD COLUMN "watchRegion" VARCHAR(2) NOT NULL DEFAULT 'US';

ALTER TABLE "UploadedMovie"
ADD CONSTRAINT "UploadedMovie_watchRegion_check"
CHECK ("watchRegion" ~ '^[A-Z]{2}$');

ALTER TABLE "UploadedMovie"
ADD CONSTRAINT "UploadedMovie_releaseYear_check"
CHECK ("releaseYear" IS NULL OR "releaseYear" BETWEEN 1888 AND 2200);

CREATE INDEX "UploadedMovie_tmdbId_idx" ON "UploadedMovie"("tmdbId");
