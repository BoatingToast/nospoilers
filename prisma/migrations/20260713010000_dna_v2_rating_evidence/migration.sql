-- Cache the TMDb evidence used by Movie DNA v2 on each rating. Existing rows
-- remain version 0 and are hydrated lazily the next time their DNA is rebuilt.
ALTER TABLE "MovieRating"
    ADD COLUMN "genreIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    ADD COLUMN "runtime" INTEGER,
    ADD COLUMN "voteAverage" DOUBLE PRECISION,
    ADD COLUMN "voteCount" INTEGER,
    ADD COLUMN "popularity" DOUBLE PRECISION,
    ADD COLUMN "originalLanguage" TEXT,
    ADD COLUMN "budget" INTEGER,
    ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "dnaMetadataVersion" INTEGER NOT NULL DEFAULT 0;
