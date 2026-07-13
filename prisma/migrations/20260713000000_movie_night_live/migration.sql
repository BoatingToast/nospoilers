-- CreateTable
CREATE TABLE "MovieNightRoom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "maxRuntime" INTEGER,
    "vetoGenres" INTEGER[] NOT NULL,
    "unseenOnly" BOOLEAN NOT NULL DEFAULT true,
    "avoidDivisive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'voting',
    "matchedCandidateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieNightRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieNightRoomParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "tokenHash" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieNightRoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieNightRoomCandidate" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT,
    "releaseDate" TEXT,
    "genreIds" INTEGER[] NOT NULL,
    "runtime" INTEGER,
    "voteAverage" DOUBLE PRECISION,
    "groupFit" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieNightRoomCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieNightVote" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieNightVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieNightRoom_code_key" ON "MovieNightRoom"("code");
CREATE INDEX "MovieNightRoom_hostId_createdAt_idx" ON "MovieNightRoom"("hostId", "createdAt" DESC);
CREATE INDEX "MovieNightRoom_code_status_idx" ON "MovieNightRoom"("code", "status");
CREATE INDEX "MovieNightRoom_expiresAt_idx" ON "MovieNightRoom"("expiresAt");
CREATE UNIQUE INDEX "MovieNightRoomParticipant_tokenHash_key" ON "MovieNightRoomParticipant"("tokenHash");
CREATE UNIQUE INDEX "MovieNightRoomParticipant_roomId_userId_key" ON "MovieNightRoomParticipant"("roomId", "userId");
CREATE INDEX "MovieNightRoomParticipant_roomId_joinedAt_idx" ON "MovieNightRoomParticipant"("roomId", "joinedAt");
CREATE INDEX "MovieNightRoomParticipant_userId_idx" ON "MovieNightRoomParticipant"("userId");
CREATE UNIQUE INDEX "MovieNightRoomCandidate_roomId_tmdbId_key" ON "MovieNightRoomCandidate"("roomId", "tmdbId");
CREATE INDEX "MovieNightRoomCandidate_roomId_position_idx" ON "MovieNightRoomCandidate"("roomId", "position");
CREATE UNIQUE INDEX "MovieNightVote_participantId_candidateId_key" ON "MovieNightVote"("participantId", "candidateId");
CREATE INDEX "MovieNightVote_candidateId_value_idx" ON "MovieNightVote"("candidateId", "value");
CREATE INDEX "MovieNightVote_participantId_idx" ON "MovieNightVote"("participantId");

-- AddForeignKey
ALTER TABLE "MovieNightRoom" ADD CONSTRAINT "MovieNightRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovieNightRoom" ADD CONSTRAINT "MovieNightRoom_matchedCandidateId_fkey" FOREIGN KEY ("matchedCandidateId") REFERENCES "MovieNightRoomCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovieNightRoomParticipant" ADD CONSTRAINT "MovieNightRoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MovieNightRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovieNightRoomParticipant" ADD CONSTRAINT "MovieNightRoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovieNightRoomCandidate" ADD CONSTRAINT "MovieNightRoomCandidate_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MovieNightRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovieNightVote" ADD CONSTRAINT "MovieNightVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MovieNightRoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovieNightVote" ADD CONSTRAINT "MovieNightVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "MovieNightRoomCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
