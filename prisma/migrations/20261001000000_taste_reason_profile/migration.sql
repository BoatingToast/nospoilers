-- Taste Lab "Why Did I Love That?": the reasons a member gave for their taste.
-- Additive only. Until this is applied the feature still runs; saving reports
-- that storage is unavailable and keeps the session in the browser.
CREATE TABLE "TasteReasonProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "notes" JSONB NOT NULL DEFAULT '{}',
    "confirmedIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "previousPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TasteReasonProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TasteReasonProfile_userId_key" ON "TasteReasonProfile"("userId");

ALTER TABLE "TasteReasonProfile"
  ADD CONSTRAINT "TasteReasonProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
