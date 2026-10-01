-- Some production databases were originally synchronized with `prisma db push`
-- from a schema that did not include this legacy column. Other deployed app
-- versions still include it in the generated Prisma client, which makes even
-- unrelated MovieRating queries fail with P2022.
--
-- Keep this repair idempotent so it is safe for databases where the original
-- MovieRating migration already created the column.
ALTER TABLE "MovieRating"
ADD COLUMN IF NOT EXISTS "confidence" TEXT NOT NULL DEFAULT 'medium';
