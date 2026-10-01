-- Collect interest in NoSpoilers Pro before billing is enabled. Entries may
-- belong to an existing account, but guests can join with only an email.
CREATE TABLE "ProWaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProWaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProWaitlistEntry_email_key" ON "ProWaitlistEntry"("email");
CREATE UNIQUE INDEX "ProWaitlistEntry_userId_key" ON "ProWaitlistEntry"("userId");
CREATE INDEX "ProWaitlistEntry_createdAt_idx" ON "ProWaitlistEntry"("createdAt" DESC);

ALTER TABLE "ProWaitlistEntry"
  ADD CONSTRAINT "ProWaitlistEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
