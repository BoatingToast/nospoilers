import { prisma } from './db'

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const CREATE_AVATAR_IMAGE_TABLE = `
  CREATE TABLE IF NOT EXISTS "AvatarImage" (
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" VARCHAR(32) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvatarImage_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "AvatarImage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  )
`

const globalForAvatarStorage = globalThis as unknown as {
  avatarImageTablePromise?: Promise<void>
}

/**
 * The production database has historically been updated with `prisma db push`,
 * so migrations can lag behind a deployment. Creating this single table on
 * first use makes avatar uploads work immediately while the checked-in migration
 * remains the canonical schema change for new environments.
 */
export async function ensureAvatarImageTable(): Promise<void> {
  if (!globalForAvatarStorage.avatarImageTablePromise) {
    globalForAvatarStorage.avatarImageTablePromise = prisma
      .$executeRawUnsafe(CREATE_AVATAR_IMAGE_TABLE)
      .then(() => undefined)
  }

  try {
    await globalForAvatarStorage.avatarImageTablePromise
  } catch (error) {
    delete globalForAvatarStorage.avatarImageTablePromise
    throw error
  }
}

export function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mimeType === 'image/webp') {
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  }
  return false
}

export function buildDatabaseAvatarUrl(userId: string, version: number): string {
  return `/api/profile/avatar/${encodeURIComponent(userId)}?v=${version}`
}
