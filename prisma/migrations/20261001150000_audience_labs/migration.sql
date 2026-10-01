ALTER TABLE "TheaterAttendance"
ADD COLUMN "recommendScore" INTEGER,
ADD COLUMN "pacing" TEXT,
ADD COLUMN "reactions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "standoutMoment" VARCHAR(600),
ADD COLUMN "improvement" VARCHAR(600),
ADD COLUMN "feedbackAt" TIMESTAMP(3);

ALTER TABLE "TheaterAttendance"
ADD CONSTRAINT "TheaterAttendance_recommendScore_check"
CHECK ("recommendScore" IS NULL OR "recommendScore" BETWEEN 0 AND 10);

ALTER TABLE "TheaterAttendance"
ADD CONSTRAINT "TheaterAttendance_pacing_check"
CHECK ("pacing" IS NULL OR "pacing" IN ('too_slow', 'just_right', 'too_fast'));
