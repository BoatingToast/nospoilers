-- Historical production environments used `prisma db push` while the checked-in
-- migration chain skipped several application models. This intentionally
-- idempotent repair migration makes both states converge and lets a brand-new
-- database reach the Plot Passport migration that follows it.

ALTER TABLE "CollectionMovie"
ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TasteProfile"
ADD COLUMN IF NOT EXISTS "dnaSnapshot" JSONB,
ADD COLUMN IF NOT EXISTS "dnaSnapshotAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
ADD COLUMN IF NOT EXISTS "bio" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "displayName" TEXT,
ADD COLUMN IF NOT EXISTS "favoriteActor" TEXT,
ADD COLUMN IF NOT EXISTS "favoriteDecade" TEXT,
ADD COLUMN IF NOT EXISTS "favoriteDirector" TEXT,
ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT,
ADD COLUMN IF NOT EXISTS "letterboxdUrl" TEXT,
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "twitterUrl" TEXT;

CREATE TABLE IF NOT EXISTS "FriendRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Friendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPrivacy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ratings" TEXT NOT NULL DEFAULT 'public',
    "watchlist" TEXT NOT NULL DEFAULT 'public',
    "collections" TEXT NOT NULL DEFAULT 'public',
    "activity" TEXT NOT NULL DEFAULT 'friends',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPrivacy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "rating" INTEGER,
    "hasSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReviewVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReviewReply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReviewReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TopFiveMovie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT,
    "releaseDate" TEXT,
    "genreIds" INTEGER[] NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TopFiveMovie_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TopFiveSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movies" JSONB NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopFiveSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpoilerZoneMessage" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isTheory" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedLabel" TEXT,
    "voteScore" INTEGER NOT NULL DEFAULT 0,
    "spoilerLevel" TEXT NOT NULL DEFAULT 'safe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SpoilerZoneMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpoilerZoneMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "moviePoster" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "SpoilerZoneMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpoilerZoneReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpoilerZoneReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpoilerZoneVote" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpoilerZoneVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivityLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newFollowers" BOOLEAN NOT NULL DEFAULT true,
    "newFriends" BOOLEAN NOT NULL DEFAULT true,
    "friendActivity" BOOLEAN NOT NULL DEFAULT true,
    "collectionUpvotes" BOOLEAN NOT NULL DEFAULT true,
    "reviewReplies" BOOLEAN NOT NULL DEFAULT true,
    "achievementUnlocks" BOOLEAN NOT NULL DEFAULT true,
    "dnaUpdates" BOOLEAN NOT NULL DEFAULT true,
    "recsRefreshed" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FriendRequest_receiverId_status_idx" ON "FriendRequest"("receiverId", "status");
CREATE INDEX IF NOT EXISTS "FriendRequest_senderId_idx" ON "FriendRequest"("senderId");
CREATE UNIQUE INDEX IF NOT EXISTS "FriendRequest_senderId_receiverId_key" ON "FriendRequest"("senderId", "receiverId");
CREATE INDEX IF NOT EXISTS "Friendship_userAId_idx" ON "Friendship"("userAId");
CREATE INDEX IF NOT EXISTS "Friendship_userBId_idx" ON "Friendship"("userBId");
CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPrivacy_userId_key" ON "UserPrivacy"("userId");
CREATE INDEX IF NOT EXISTS "Review_tmdbId_createdAt_idx" ON "Review"("tmdbId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "Review"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_tmdbId_key" ON "Review"("userId", "tmdbId");
CREATE INDEX IF NOT EXISTS "ReviewVote_reviewId_idx" ON "ReviewVote"("reviewId");
CREATE INDEX IF NOT EXISTS "ReviewVote_userId_idx" ON "ReviewVote"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewVote_reviewId_userId_type_key" ON "ReviewVote"("reviewId", "userId", "type");
CREATE INDEX IF NOT EXISTS "ReviewReply_reviewId_createdAt_idx" ON "ReviewReply"("reviewId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReviewReply_userId_idx" ON "ReviewReply"("userId");
CREATE INDEX IF NOT EXISTS "TopFiveMovie_userId_position_idx" ON "TopFiveMovie"("userId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "TopFiveMovie_userId_position_key" ON "TopFiveMovie"("userId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "TopFiveMovie_userId_tmdbId_key" ON "TopFiveMovie"("userId", "tmdbId");
CREATE INDEX IF NOT EXISTS "TopFiveSnapshot_userId_savedAt_idx" ON "TopFiveSnapshot"("userId", "savedAt" DESC);
CREATE INDEX IF NOT EXISTS "SpoilerZoneMessage_tmdbId_createdAt_idx" ON "SpoilerZoneMessage"("tmdbId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SpoilerZoneMessage_tmdbId_voteScore_idx" ON "SpoilerZoneMessage"("tmdbId", "voteScore" DESC);
CREATE INDEX IF NOT EXISTS "SpoilerZoneMessage_tmdbId_isPinned_idx" ON "SpoilerZoneMessage"("tmdbId", "isPinned");
CREATE INDEX IF NOT EXISTS "SpoilerZoneMessage_tmdbId_isTheory_idx" ON "SpoilerZoneMessage"("tmdbId", "isTheory");
CREATE INDEX IF NOT EXISTS "SpoilerZoneMessage_tmdbId_spoilerLevel_idx" ON "SpoilerZoneMessage"("tmdbId", "spoilerLevel");
CREATE INDEX IF NOT EXISTS "SpoilerZoneMessage_parentId_idx" ON "SpoilerZoneMessage"("parentId");
CREATE INDEX IF NOT EXISTS "SpoilerZoneMessage_userId_idx" ON "SpoilerZoneMessage"("userId");
CREATE INDEX IF NOT EXISTS "SpoilerZoneMembership_userId_idx" ON "SpoilerZoneMembership"("userId");
CREATE INDEX IF NOT EXISTS "SpoilerZoneMembership_tmdbId_idx" ON "SpoilerZoneMembership"("tmdbId");
CREATE INDEX IF NOT EXISTS "SpoilerZoneMembership_userId_createdAt_idx" ON "SpoilerZoneMembership"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SpoilerZoneMembership_userId_pinned_idx" ON "SpoilerZoneMembership"("userId", "pinned");
CREATE UNIQUE INDEX IF NOT EXISTS "SpoilerZoneMembership_userId_tmdbId_key" ON "SpoilerZoneMembership"("userId", "tmdbId");
CREATE INDEX IF NOT EXISTS "SpoilerZoneReaction_messageId_idx" ON "SpoilerZoneReaction"("messageId");
CREATE INDEX IF NOT EXISTS "SpoilerZoneReaction_userId_idx" ON "SpoilerZoneReaction"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "SpoilerZoneReaction_messageId_userId_emoji_key" ON "SpoilerZoneReaction"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "SpoilerZoneVote_messageId_idx" ON "SpoilerZoneVote"("messageId");
CREATE INDEX IF NOT EXISTS "SpoilerZoneVote_userId_idx" ON "SpoilerZoneVote"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "SpoilerZoneVote_messageId_userId_key" ON "SpoilerZoneVote"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "Notification_recipientId_read_idx" ON "Notification"("recipientId", "read");
CREATE INDEX IF NOT EXISTS "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_actorId_idx" ON "Notification"("actorId");
CREATE INDEX IF NOT EXISTS "ActivityLike_activityEventId_idx" ON "ActivityLike"("activityEventId");
CREATE UNIQUE INDEX IF NOT EXISTS "ActivityLike_userId_activityEventId_key" ON "ActivityLike"("userId", "activityEventId");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

DO $repair$
BEGIN
  ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "UserPrivacy" ADD CONSTRAINT "UserPrivacy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "TopFiveMovie" ADD CONSTRAINT "TopFiveMovie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "TopFiveSnapshot" ADD CONSTRAINT "TopFiveSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "SpoilerZoneMessage" ADD CONSTRAINT "SpoilerZoneMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "SpoilerZoneMessage" ADD CONSTRAINT "SpoilerZoneMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SpoilerZoneMessage"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "SpoilerZoneMembership" ADD CONSTRAINT "SpoilerZoneMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "SpoilerZoneReaction" ADD CONSTRAINT "SpoilerZoneReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SpoilerZoneMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "SpoilerZoneReaction" ADD CONSTRAINT "SpoilerZoneReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "SpoilerZoneVote" ADD CONSTRAINT "SpoilerZoneVote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SpoilerZoneMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "SpoilerZoneVote" ADD CONSTRAINT "SpoilerZoneVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "ActivityLike" ADD CONSTRAINT "ActivityLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
DO $repair$ BEGIN
  ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $repair$;
