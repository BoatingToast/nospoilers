import { prisma } from '@/lib/db'
import { awardXP } from './xp'
import { checkAndUpdateAchievements } from './achievements'
import type { CollectionData } from '@/types'

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCollection(
  userId: string,
  data: { title: string; description?: string; isPublic?: boolean },
): Promise<CollectionData> {
  const collection = await prisma.collection.create({
    data: { userId, title: data.title, description: data.description, isPublic: data.isPublic ?? true },
    include: { movies: true, user: { select: { username: true } } },
  })

  await awardXP(userId, 20, 'created_collection', { collectionTitle: data.title })
  await checkAndUpdateAchievements(userId, 'created_collection')
  await prisma.activityEvent.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { userId, type: 'created_collection', data: { collectionTitle: data.title } as any },
  }).catch(() => {})

  return toData(collection)
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCollection(
  userId: string,
  collectionId: string,
  data: { title?: string; description?: string; isPublic?: boolean; coverPath?: string },
): Promise<CollectionData> {
  const collection = await prisma.collection.update({
    where:   { id: collectionId, userId },
    data:    { ...data, updatedAt: new Date() },
    include: { movies: true, user: { select: { username: true } } },
  })
  return toData(collection)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteCollection(userId: string, collectionId: string): Promise<void> {
  await prisma.collection.delete({ where: { id: collectionId, userId } })
}

// ─── Add movie to collection ──────────────────────────────────────────────────

export async function addMovieToCollection(
  collectionId: string,
  movie: { tmdbId: number; title: string; posterPath: string | null; releaseDate: string | null; position?: number },
): Promise<void> {
  await prisma.collectionMovie.upsert({
    where:  { collectionId_tmdbId: { collectionId, tmdbId: movie.tmdbId } },
    create: { collectionId, tmdbId: movie.tmdbId, title: movie.title, posterPath: movie.posterPath ?? null, releaseDate: movie.releaseDate ?? null, position: movie.position ?? 0 },
    update: {},
  })

  // Update collection's updatedAt + set cover if not set
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } })
  if (collection) {
    await prisma.collection.update({
      where: { id: collectionId },
      data: {
        updatedAt: new Date(),
        ...(!collection.coverPath && movie.posterPath ? { coverPath: movie.posterPath } : {}),
      },
    })
  }
}

// ─── Remove movie from collection ────────────────────────────────────────────

export async function removeMovieFromCollection(collectionId: string, tmdbId: number): Promise<void> {
  await prisma.collectionMovie.deleteMany({ where: { collectionId, tmdbId } })
}

// ─── Fetch single ─────────────────────────────────────────────────────────────

export async function getCollection(id: string): Promise<CollectionData | null> {
  const collection = await prisma.collection.findUnique({
    where:   { id },
    include: { movies: { orderBy: [{ position: 'asc' }, { addedAt: 'asc' }] }, user: { select: { username: true } } },
  })
  if (!collection) return null
  return toData(collection)
}

// ─── Fetch user's collections ─────────────────────────────────────────────────

export async function getUserCollections(userId: string): Promise<CollectionData[]> {
  const collections = await prisma.collection.findMany({
    where:   { userId },
    include: { movies: { orderBy: [{ position: 'asc' }, { addedAt: 'asc' }] }, user: { select: { username: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  return collections.map(toData)
}

// ─── Browse public collections ────────────────────────────────────────────────

export async function getPublicCollections(limit = 24): Promise<CollectionData[]> {
  const collections = await prisma.collection.findMany({
    where:   { isPublic: true },
    include: { movies: { take: 4, orderBy: [{ position: 'asc' }, { addedAt: 'asc' }] }, user: { select: { username: true } } },
    orderBy: { updatedAt: 'desc' },
    take:    limit,
  })
  return collections.map(toData)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toData(c: {
  id: string; userId: string; title: string; description: string | null
  coverPath: string | null; isPublic: boolean; createdAt: Date
  movies: { id: string; tmdbId: number; title: string; posterPath: string | null; releaseDate: string | null; addedAt: Date; position: number }[]
  user: { username: string }
}): CollectionData {
  return {
    id:          c.id,
    userId:      c.userId,
    username:    c.user.username,
    title:       c.title,
    description: c.description,
    coverPath:   c.coverPath ?? c.movies[0]?.posterPath ?? null,
    isPublic:    c.isPublic,
    movieCount:  c.movies.length,
    movies:      c.movies.map(m => ({
      id:          m.id,
      tmdbId:      m.tmdbId,
      title:       m.title,
      posterPath:  m.posterPath,
      releaseDate: m.releaseDate,
      addedAt:     m.addedAt.toISOString(),
      position:    m.position,
    })),
    createdAt:   c.createdAt.toISOString(),
  }
}
