ALTER TABLE "UserPreferences"
ADD COLUMN "pacingScale" INTEGER,
ADD COLUMN "endingClosure" INTEGER,
ADD COLUMN "storytellingScale" INTEGER,
ADD COLUMN "toneScale" INTEGER,
ADD COLUMN "escapism" INTEGER,
ADD COLUMN "emotionalIntensity" INTEGER,
ADD COLUMN "eraOpenness" INTEGER,
ADD COLUMN "runtimePreference" INTEGER,
ADD COLUMN "popularityPreference" INTEGER,
ADD COLUMN "discoveryPreference" INTEGER,
ADD COLUMN "subtitleOpenness" INTEGER,
ADD COLUMN "violenceTolerance" INTEGER,
ADD COLUMN "horrorTolerance" INTEGER,
ADD COLUMN "animationOpenness" INTEGER,
ADD COLUMN "documentaryOpenness" INTEGER,
ADD COLUMN "excludedGenres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "UserPreferences"
ADD CONSTRAINT "UserPreferences_spectrum_ranges_check" CHECK (
  ("pacingScale" IS NULL OR "pacingScale" BETWEEN 1 AND 10) AND
  ("endingClosure" IS NULL OR "endingClosure" BETWEEN 1 AND 10) AND
  ("storytellingScale" IS NULL OR "storytellingScale" BETWEEN 1 AND 10) AND
  ("toneScale" IS NULL OR "toneScale" BETWEEN 1 AND 10) AND
  "complexity" BETWEEN 1 AND 10 AND
  "plotTwists" BETWEEN 1 AND 10 AND
  ("escapism" IS NULL OR "escapism" BETWEEN 1 AND 10) AND
  ("emotionalIntensity" IS NULL OR "emotionalIntensity" BETWEEN 1 AND 10) AND
  ("eraOpenness" IS NULL OR "eraOpenness" BETWEEN 1 AND 10) AND
  ("runtimePreference" IS NULL OR "runtimePreference" BETWEEN 1 AND 10) AND
  ("popularityPreference" IS NULL OR "popularityPreference" BETWEEN 1 AND 10) AND
  ("discoveryPreference" IS NULL OR "discoveryPreference" BETWEEN 1 AND 10) AND
  ("subtitleOpenness" IS NULL OR "subtitleOpenness" BETWEEN 1 AND 10) AND
  ("violenceTolerance" IS NULL OR "violenceTolerance" BETWEEN 1 AND 10) AND
  ("horrorTolerance" IS NULL OR "horrorTolerance" BETWEEN 1 AND 10) AND
  ("animationOpenness" IS NULL OR "animationOpenness" BETWEEN 1 AND 10) AND
  ("documentaryOpenness" IS NULL OR "documentaryOpenness" BETWEEN 1 AND 10)
);
