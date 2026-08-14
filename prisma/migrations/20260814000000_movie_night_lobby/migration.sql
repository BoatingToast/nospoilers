-- New Movie Night rooms wait in a lobby until the host starts the ballot.
ALTER TABLE "MovieNightRoom" ALTER COLUMN "status" SET DEFAULT 'lobby';

-- Preserve in-progress ballots. Rooms that have not received any votes can
-- safely enter the new lobby flow when this migration is deployed.
UPDATE "MovieNightRoom" AS room
SET "status" = 'lobby'
WHERE room."status" = 'voting'
  AND NOT EXISTS (
    SELECT 1
    FROM "MovieNightRoomCandidate" AS candidate
    INNER JOIN "MovieNightVote" AS vote ON vote."candidateId" = candidate."id"
    WHERE candidate."roomId" = room."id"
  );
