-- Keep small, cropped profile pictures in the existing Postgres database so
-- avatar uploads do not require a second storage service. IF NOT EXISTS keeps
-- this migration compatible with deployments where the route self-created the
-- table before the migration history caught up.
CREATE TABLE IF NOT EXISTS "AvatarImage" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" VARCHAR(32) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvatarImage_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "AvatarImage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);
