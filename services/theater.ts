import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase-storage'
import { MOVIE_UPLOAD_BUCKET } from '@/lib/movie-uploads'
import {
  nextAvailableSeat, normalizeTheaterAvatar, parsePremiereInput, parseTheaterRating,
  requiresTheaterRating, theaterStatus, TheaterError, THEATER_PRESENCE_MS,
  type TheaterKind, type TheaterPremiere, type TheaterRoomData,
} from '@/lib/theater'

const premiereInclude = {
  owner: { select: { username: true, displayName: true } },
  _count: { select: { attendees: true } },
} satisfies Prisma.TheaterPremiereInclude

type PremiereRow = Prisma.TheaterPremiereGetPayload<{ include: typeof premiereInclude }>

function serializePremiere(premiere: PremiereRow, userId: string, now: number): TheaterPremiere {
  return {
    id: premiere.id, title: premiere.title, description: premiere.description,
    kind: premiere.kind as TheaterKind, startsAt: premiere.startsAt.toISOString(), endsAt: premiere.endsAt.toISOString(),
    durationSeconds: premiere.durationSeconds, capacity: premiere.capacity,
    promoted: premiere.promoted, adCopy: premiere.adCopy, status: theaterStatus(premiere, now),
    creatorName: premiere.owner.displayName || premiere.owner.username,
    isOwner: premiere.ownerId === userId, reservedSeats: premiere._count.attendees,
  }
}

async function pendingRating(userId: string, db: Prisma.TransactionClient = prisma) {
  return db.theaterAttendance.findFirst({
    where: {
      userId, rating: null, watchedAt: { not: null },
      premiere: { endsAt: { lte: new Date() }, cancelledAt: null, ownerId: { not: userId } },
    },
    orderBy: { joinedAt: 'asc' },
    select: { premiereId: true },
  })
}

export async function listPremieres(userId: string) {
  const now = Date.now()
  const [premieres, pending] = await Promise.all([
    prisma.theaterPremiere.findMany({
      where: { OR: [
        { cancelledAt: null, endsAt: { gt: new Date(now) } },
        { ownerId: userId },
        { attendees: { some: { userId, rating: null, watchedAt: { not: null } } }, cancelledAt: null },
      ] },
      include: premiereInclude, orderBy: { startsAt: 'asc' }, take: 100,
    }),
    pendingRating(userId),
  ])
  return { premieres: premieres.map(p => serializePremiere(p, userId, now)), pendingRatingId: pending?.premiereId ?? null }
}

export async function createPremiere(userId: string, body: unknown) {
  const data = parsePremiereInput(body)
  const upload = await prisma.uploadedMovie.findFirst({ where: { id: data.uploadId, userId, status: 'ready' } })
  if (!upload) throw new TheaterError('Choose a completed upload that belongs to you.', 403)
  return prisma.theaterPremiere.create({ data: { ...data, ownerId: userId }, select: { id: true } })
}

export async function readTheaterRoom(id: string, userId: string): Promise<TheaterRoomData> {
  const premiere = await prisma.theaterPremiere.findUnique({
    where: { id }, include: {
      ...premiereInclude,
      attendees: { include: { user: { select: { username: true, displayName: true } } }, orderBy: { seat: 'asc' } },
    },
  })
  if (!premiere) throw new TheaterError('Premiere not found.', 404)
  const now = Date.now()
  const mine = premiere.attendees.find(a => a.userId === userId)
  const isOwner = premiere.ownerId === userId
  const pending = await pendingRating(userId)
  const ratings = premiere.attendees.flatMap(a => a.rating === null ? [] : [a.rating])
  return {
    premiere: serializePremiere(premiere, userId, now), serverNow: new Date(now).toISOString(), viewerId: userId,
    participants: premiere.attendees.map(a => ({
      userId: a.userId, name: a.user.displayName || a.user.username, seat: a.seat,
      avatar: normalizeTheaterAvatar(a.avatar), present: now - a.lastSeenAt.getTime() < THEATER_PRESENCE_MS,
    })),
    mySeat: mine?.seat ?? null, myRating: mine?.rating ?? null,
    ratingRequired: requiresTheaterRating({ isOwner, watchedAt: mine?.watchedAt ?? null, rating: mine?.rating ?? null, status: theaterStatus(premiere, now) }),
    pendingRatingId: pending?.premiereId ?? null,
    ratingSummary: isOwner ? { count: ratings.length, average: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null } : null,
  }
}

// Serialize seat claims across app instances. Unique constraints provide a second
// guard against duplicate seats; serializable retries handle simultaneous joins.
async function claimSeat(id: string, userId: string, avatar: unknown) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const premiere = await tx.theaterPremiere.findUnique({ where: { id } })
        if (!premiere) throw new TheaterError('Premiere not found.', 404)
        if (premiere.ownerId === userId) return { ok: true }
        const pending = await pendingRating(userId, tx)
        if (pending) throw new TheaterError('Rate your previous premiere before entering another theater.', 409)
        if (!['upcoming', 'live'].includes(theaterStatus(premiere))) throw new TheaterError('This premiere is no longer accepting viewers.', 409)
        const existing = await tx.theaterAttendance.findUnique({ where: { premiereId_userId: { premiereId: id, userId } } })
        if (existing) {
          await tx.theaterAttendance.update({ where: { id: existing.id }, data: { lastSeenAt: new Date(), avatar: { ...normalizeTheaterAvatar(avatar) } } })
          return { ok: true }
        }
        const attendees = await tx.theaterAttendance.findMany({ where: { premiereId: id }, select: { seat: true } })
        const seat = nextAvailableSeat(premiere.capacity, attendees.map(a => a.seat))
        if (seat === null) throw new TheaterError('This theater is full. All seats have been reserved.', 409)
        await tx.theaterAttendance.create({ data: { premiereId: id, userId, seat, avatar: { ...normalizeTheaterAvatar(avatar) } } })
        return { ok: true }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) continue
      throw error
    }
  }
  throw new TheaterError('Seats are being reserved quickly. Please try again.', 409)
}

export async function theaterAction(id: string, userId: string, value: unknown) {
  if (!value || typeof value !== 'object') throw new TheaterError('Choose a theater action.')
  const body = value as Record<string, unknown>
  if (body.action === 'join') return claimSeat(id, userId, body.avatar)
  const premiere = await prisma.theaterPremiere.findUnique({ where: { id } })
  if (!premiere) throw new TheaterError('Premiere not found.', 404)
  const status = theaterStatus(premiere)
  if (body.action === 'cancel') {
    if (premiere.ownerId !== userId) throw new TheaterError('Only the creator can cancel this premiere.', 403)
    const result = await prisma.theaterPremiere.updateMany({
      where: { id, ownerId: userId, startsAt: { gt: new Date() }, cancelledAt: null }, data: { cancelledAt: new Date() },
    })
    if (!result.count) throw new TheaterError('Only an upcoming premiere can be cancelled.', 409)
    return { ok: true }
  }
  if (premiere.ownerId === userId && body.action === 'heartbeat') return { ok: true }
  const attendance = await prisma.theaterAttendance.findUnique({ where: { premiereId_userId: { premiereId: id, userId } } })
  if (!attendance) throw new TheaterError('Reserve a seat before entering this theater.', 403)
  if (body.action === 'heartbeat') {
    if (status === 'cancelled') return { ok: true }
    const data: Prisma.TheaterAttendanceUpdateInput = { lastSeenAt: new Date() }
    if (status === 'live' && body.playing === true && !attendance.watchedAt) data.watchedAt = new Date()
    await prisma.theaterAttendance.update({ where: { id: attendance.id }, data })
    return { ok: true }
  }
  if (body.action === 'rate') {
    const rating = parseTheaterRating(body.rating)
    if (!attendance.watchedAt || status !== 'ended' || premiere.ownerId === userId) {
      throw new TheaterError('Ratings open after the premiere for viewers who attended playback.', 409)
    }
    // A repeated submission is idempotent. A creator never rates their own film.
    await prisma.theaterAttendance.updateMany({ where: { id: attendance.id, rating: null }, data: { rating, ratedAt: new Date() } })
    return { ok: true }
  }
  if (body.action === 'leave') {
    if (requiresTheaterRating({ isOwner: premiere.ownerId === userId, watchedAt: attendance.watchedAt, rating: attendance.rating, status })) {
      throw new TheaterError('Rate the premiere before leaving the theater.', 409)
    }
    await prisma.theaterAttendance.update({ where: { id: attendance.id }, data: { lastSeenAt: new Date(0) } })
    return { ok: true }
  }
  throw new TheaterError('Unknown theater action.')
}

export async function signedTheaterUpload(uploadId: string, userId: string) {
  const upload = await prisma.uploadedMovie.findFirst({ where: { id: uploadId, userId, status: 'ready' } })
  if (!upload) throw new TheaterError('Upload not found.', 404)
  return signVideo(upload.storagePath, 600)
}

async function signVideo(path: string, expiresIn: number) {
  const { data, error } = await getSupabaseAdmin().storage.from(MOVIE_UPLOAD_BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data) throw new TheaterError('The video is unavailable. Please try again.', 503)
  return { url: data.signedUrl }
}

export async function theaterStream(id: string, userId: string) {
  const premiere = await prisma.theaterPremiere.findUnique({ where: { id }, include: { upload: true } })
  if (!premiere) throw new TheaterError('Premiere not found.', 404)
  if (theaterStatus(premiere) !== 'live') throw new TheaterError('Playback is only available during the scheduled premiere.', 409)
  if (premiere.ownerId !== userId) {
    const attendance = await prisma.theaterAttendance.findUnique({ where: { premiereId_userId: { premiereId: id, userId } } })
    if (!attendance) throw new TheaterError('Reserve a seat to watch this premiere.', 403)
    const pending = await pendingRating(userId)
    if (pending) throw new TheaterError('Rate your previous premiere before watching another.', 409)
  }
  const ttl = Math.max(60, Math.ceil((premiere.endsAt.getTime() - Date.now()) / 1000) + 120)
  return signVideo(premiere.upload.storagePath, ttl)
}
