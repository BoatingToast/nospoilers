-- Plot Passport stores a viewer's reveal boundary and a content boundary on reviews.
ALTER TABLE "WatchlistItem"
ADD COLUMN "progressPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currentSeason" INTEGER,
ADD COLUMN "currentEpisode" INTEGER,
ADD COLUMN "passportUpdatedAt" TIMESTAMP(3);

UPDATE "WatchlistItem"
SET
  "progressPercent" = CASE
    WHEN "status" = 'watched' THEN 100
    WHEN "status" = 'watching' THEN 50
    ELSE 0
  END,
  "passportUpdatedAt" = "updatedAt";

ALTER TABLE "Review"
ADD COLUMN "spoilerLevel" TEXT NOT NULL DEFAULT 'safe';

UPDATE "Review"
SET "spoilerLevel" = CASE WHEN "hasSpoilers" THEN 'ending' ELSE 'safe' END;

ALTER TABLE "WatchlistItem"
ADD CONSTRAINT "WatchlistItem_progressPercent_check"
CHECK ("progressPercent" >= 0 AND "progressPercent" <= 100);

ALTER TABLE "Review"
ADD CONSTRAINT "Review_spoilerLevel_check"
CHECK ("spoilerLevel" IN ('safe', 'mid', 'ending'));
