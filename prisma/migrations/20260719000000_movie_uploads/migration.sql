-- Store metadata for creator-owned films. The video itself is uploaded directly
-- to Supabase Storage so large files never pass through the Next.js server.
CREATE TABLE "UploadedMovie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000),
    "originalFileName" VARCHAR(255) NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedMovie_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UploadedMovie_status_check" CHECK ("status" IN ('uploading', 'ready')),
    CONSTRAINT "UploadedMovie_fileSize_check" CHECK ("fileSize" > 0)
);

CREATE UNIQUE INDEX "UploadedMovie_storagePath_key" ON "UploadedMovie"("storagePath");
CREATE INDEX "UploadedMovie_userId_createdAt_idx" ON "UploadedMovie"("userId", "createdAt" DESC);
CREATE INDEX "UploadedMovie_status_uploadedAt_idx" ON "UploadedMovie"("status", "uploadedAt" DESC);

ALTER TABLE "UploadedMovie"
ADD CONSTRAINT "UploadedMovie_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
