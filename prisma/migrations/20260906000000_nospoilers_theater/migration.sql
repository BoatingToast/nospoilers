-- CreateTable
CREATE TABLE "TheaterPremiere" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "kind" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 48,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "adCopy" VARCHAR(180),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TheaterPremiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TheaterAttendance" (
    "id" TEXT NOT NULL,
    "premiereId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "avatar" JSONB NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "ratedAt" TIMESTAMP(3),

    CONSTRAINT "TheaterAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TheaterPremiere_startsAt_idx" ON "TheaterPremiere"("startsAt");

-- CreateIndex
CREATE INDEX "TheaterPremiere_ownerId_startsAt_idx" ON "TheaterPremiere"("ownerId", "startsAt");

-- CreateIndex
CREATE INDEX "TheaterPremiere_uploadId_idx" ON "TheaterPremiere"("uploadId");

-- CreateIndex
CREATE INDEX "TheaterAttendance_userId_rating_idx" ON "TheaterAttendance"("userId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "TheaterAttendance_premiereId_userId_key" ON "TheaterAttendance"("premiereId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TheaterAttendance_premiereId_seat_key" ON "TheaterAttendance"("premiereId", "seat");

-- AddForeignKey
ALTER TABLE "TheaterPremiere" ADD CONSTRAINT "TheaterPremiere_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterPremiere" ADD CONSTRAINT "TheaterPremiere_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "UploadedMovie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterAttendance" ADD CONSTRAINT "TheaterAttendance_premiereId_fkey" FOREIGN KEY ("premiereId") REFERENCES "TheaterPremiere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterAttendance" ADD CONSTRAINT "TheaterAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
