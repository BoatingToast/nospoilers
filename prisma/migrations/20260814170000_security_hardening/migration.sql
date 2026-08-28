-- Remove the final non-data schema drift from the historical db-push period.
ALTER TABLE "AvatarImage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Shared request budgets for serverless-safe rate limiting.
CREATE TABLE "RateLimitBucket" (
    "key" VARCHAR(128) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
