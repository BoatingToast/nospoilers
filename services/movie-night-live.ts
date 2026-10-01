import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { decideMovieNightOutcome } from '@/lib/movie-night-outcome'
import type { MovieNightLiveState, MovieNightVoteValue } from '@/types'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_CANDIDATES = 12
const MAX_PARTICIPANTS = 12
const ROOM_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
const VALID_MOODS = new Set(['crowd', 'tense', 'chill', 'deep', 'wildcard'])

export class MovieNightRoomError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'MovieNightRoomError'
  }
}

function roomError(message: string, status: number): never {
  throw new MovieNightRoomError(message, status)
}

export interface LiveRoomCandidateInput {
  tmdbId:      number
  title:       string
  posterPath?: string | null
  releaseDate?: string | null
  genreIds?:   number[]
  runtime?:    number | null
  voteAverage?:number | null
  groupFit:    number
  explanation?:string
}

export interface CreateLiveRoomInput {
  name:          string
  mood:          string
  maxRuntime:    number | null
  vetoGenres:    number[]
  unseenOnly:    boolean
  avoidDivisive: boolean
  candidates:    LiveRoomCandidateInput[]
}

function makeRoomCode(): string {
  const bytes = randomBytes(6)
  return Array.from(bytes, byte => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('')
}

function makeParticipantToken(): string {
  return randomBytes(24).toString('base64url')
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function cleanName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, 40)
  return cleaned || fallback
}

function cleanText(value: unknown, fallback: string, maxLength = 300): string {
  if (typeof value !== 'string') return fallback
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
  return cleaned || fallback
}

async function uniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeRoomCode()
    const exists = await prisma.movieNightRoom.findUnique({ where: { code }, select: { id: true } })
    if (!exists) return code
  }
  throw new Error('Could not create a unique room code')
}

function normalizeCandidates(candidates: LiveRoomCandidateInput[]) {
  const seen = new Set<number>()

  return candidates
    .filter(candidate => {
      if (!candidate || typeof candidate !== 'object') return false
      if (!Number.isInteger(candidate.tmdbId) || candidate.tmdbId <= 0 || seen.has(candidate.tmdbId)) return false
      if (typeof candidate.title !== 'string' || !candidate.title.trim()) return false
      seen.add(candidate.tmdbId)
      return true
    })
    .slice(0, MAX_CANDIDATES)
    .map((candidate, position) => ({
      tmdbId:      candidate.tmdbId,
      title:       candidate.title.trim().slice(0, 180),
      posterPath:  typeof candidate.posterPath === 'string' ? candidate.posterPath.slice(0, 240) : null,
      releaseDate: typeof candidate.releaseDate === 'string' ? candidate.releaseDate.slice(0, 24) : null,
      genreIds:    Array.isArray(candidate.genreIds)
        ? [...new Set(candidate.genreIds.filter(id => Number.isInteger(id) && id > 0))].slice(0, 12)
        : [],
      runtime:     Number.isInteger(candidate.runtime) && candidate.runtime! > 0 && candidate.runtime! <= 600
        ? candidate.runtime
        : null,
      voteAverage: typeof candidate.voteAverage === 'number' && Number.isFinite(candidate.voteAverage)
        ? Math.max(0, Math.min(10, candidate.voteAverage))
        : null,
      groupFit:    typeof candidate.groupFit === 'number' && Number.isFinite(candidate.groupFit)
        ? Math.max(1, Math.min(99, Math.round(candidate.groupFit)))
        : 1,
      explanation: cleanText(candidate.explanation, 'A strong fit for this group.'),
      position,
    }))
}

export async function createLiveMovieNightRoom(hostId: string, input: CreateLiveRoomInput) {
  const [host, code] = await Promise.all([
    prisma.user.findUnique({
      where: { id: hostId },
      select: { username: true, avatarUrl: true },
    }),
    uniqueRoomCode(),
  ])

  if (!host) roomError('Host not found', 404)

  const safeInput: Partial<CreateLiveRoomInput> = input && typeof input === 'object' ? input : {}
  const mood = typeof safeInput.mood === 'string' && VALID_MOODS.has(safeInput.mood)
    ? safeInput.mood
    : 'crowd'
  const maxRuntime = safeInput.maxRuntime === null
    ? null
    : Number.isInteger(safeInput.maxRuntime) && safeInput.maxRuntime! >= 60 && safeInput.maxRuntime! <= 360
      ? safeInput.maxRuntime!
      : null

  const candidates = normalizeCandidates(Array.isArray(safeInput.candidates) ? safeInput.candidates : [])
  if (candidates.length < 2) roomError('At least two movie candidates are required', 400)

  const token = makeParticipantToken()
  await prisma.movieNightRoom.create({
    data: {
      code,
      hostId,
      name:          cleanName(safeInput.name, 'Movie Night'),
      mood,
      maxRuntime,
      vetoGenres:    Array.isArray(safeInput.vetoGenres)
        ? [...new Set(safeInput.vetoGenres.filter(id => Number.isInteger(id) && id > 0))].slice(0, 12)
        : [],
      unseenOnly:    safeInput.unseenOnly !== false,
      avoidDivisive: safeInput.avoidDivisive === true,
      status:        'lobby',
      expiresAt:     new Date(Date.now() + ROOM_LIFETIME_MS),
      candidates: { create: candidates },
      participants: {
        create: {
          userId:      hostId,
          displayName: host.username,
          avatarUrl:   host.avatarUrl,
          tokenHash:   hashToken(token),
          isHost:      true,
        },
      },
    },
  })

  return { code, token }
}

export async function joinLiveMovieNightRoom(
  codeInput: string,
  displayNameInput: unknown,
  user?: { id: string; username: string; avatarUrl: string | null } | null,
  existingToken?: string | null,
) {
  const code = codeInput.trim().toUpperCase()
  const room = await prisma.movieNightRoom.findUnique({
    where: { code },
    include: { participants: { select: { id: true, userId: true, tokenHash: true } } },
  })

  if (!room || room.expiresAt <= new Date()) roomError('Room not found or expired', 404)

  const suppliedTokenHash = existingToken ? hashToken(existingToken) : null
  const existing = room.participants.find(participant =>
    (suppliedTokenHash && participant.tokenHash === suppliedTokenHash)
      || (user && participant.userId === user.id),
  )
  const displayName = cleanName(displayNameInput, user?.username ?? 'Guest')

  // Existing participants may reconnect after the host starts; they do not
  // change the locked roster. A valid cookie/token also prevents an anonymous
  // refresh from creating a duplicate seat.
  if (existing) {
    const token = suppliedTokenHash === existing.tokenHash && existingToken
      ? existingToken
      : makeParticipantToken()
    const tokenHash = hashToken(token)

    await prisma.movieNightRoomParticipant.update({
      where: { id: existing.id },
      data: {
        tokenHash,
        displayName,
        avatarUrl: user?.avatarUrl ?? undefined,
      },
    })
    return { token, participantId: existing.id }
  }

  if (room.status !== 'lobby') roomError('This room has already started', 409)

  const token = makeParticipantToken()
  const tokenHash = hashToken(token)
  const participant = await prisma.$transaction(async tx => {
    // Updating the room inside the transaction takes a row lock. A concurrent
    // host start therefore happens entirely before or after this seat is added.
    const lobbyLock = await tx.movieNightRoom.updateMany({
      where: { id: room.id, status: 'lobby', expiresAt: { gt: new Date() } },
      data: { updatedAt: new Date() },
    })
    if (lobbyLock.count === 0) roomError('This room has already started', 409)

    const participantCount = await tx.movieNightRoomParticipant.count({ where: { roomId: room.id } })
    if (participantCount >= MAX_PARTICIPANTS) roomError('This room is full', 409)

    return tx.movieNightRoomParticipant.create({
      data: {
        roomId: room.id,
        userId: user?.id ?? null,
        displayName,
        avatarUrl: user?.avatarUrl ?? null,
        tokenHash,
      },
      select: { id: true },
    })
  })

  return { token, participantId: participant.id }
}

export async function startLiveMovieNightRoom(codeInput: string, token: string) {
  const code = codeInput.trim().toUpperCase()
  const participant = await prisma.movieNightRoomParticipant.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      room: true,
    },
  })

  if (!participant || participant.room.code !== code) roomError('Join this room before starting', 401)
  if (!participant.isHost) roomError('Only the host can start voting', 403)
  if (participant.room.expiresAt <= new Date()) roomError('Room not found or expired', 404)
  if (participant.room.status === 'voting') return
  if (participant.room.status !== 'lobby') roomError('This room has already ended', 409)

  await prisma.$transaction(async tx => {
    // Lock the room before counting so a join cannot slip between the roster
    // check and the transition to voting.
    const lobbyLock = await tx.movieNightRoom.updateMany({
      where: { id: participant.room.id, status: 'lobby', expiresAt: { gt: new Date() } },
      data: { updatedAt: new Date() },
    })
    if (lobbyLock.count === 0) roomError('This room has already started', 409)

    const participantCount = await tx.movieNightRoomParticipant.count({
      where: { roomId: participant.room.id },
    })
    if (participantCount < 2) roomError('Invite at least one other voter before starting', 409)

    await tx.movieNightRoom.update({
      where: { id: participant.room.id },
      data: { status: 'voting' },
    })
  })
}

export async function getLiveMovieNightRoom(codeInput: string, token?: string | null): Promise<MovieNightLiveState | null> {
  const code = codeInput.trim().toUpperCase()
  const room = await prisma.movieNightRoom.findUnique({
    where: { code },
    include: {
      participants: {
        orderBy: [{ isHost: 'desc' }, { joinedAt: 'asc' }],
        include: { votes: { select: { candidateId: true } } },
      },
      candidates: {
        orderBy: { position: 'asc' },
        include: { votes: { select: { participantId: true, value: true } } },
      },
    },
  })

  if (!room) return null

  let status = room.status as MovieNightLiveState['status']
  if (room.expiresAt <= new Date() && (status === 'lobby' || status === 'voting')) {
    status = 'closed'
    await prisma.movieNightRoom.update({ where: { id: room.id }, data: { status } }).catch(() => undefined)
  }

  const tokenHash = token ? hashToken(token) : null
  const currentParticipant = tokenHash
    ? room.participants.find(participant => participant.tokenHash === tokenHash) ?? null
    : null
  const candidateCount = room.candidates.length

  const candidates = room.candidates.map(candidate => {
    const mine = currentParticipant
      ? candidate.votes.find(vote => vote.participantId === currentParticipant.id)
      : null

    return {
      id:          candidate.id,
      tmdbId:      candidate.tmdbId,
      title:       candidate.title,
      posterPath:  candidate.posterPath,
      releaseDate: candidate.releaseDate,
      genreIds:    candidate.genreIds,
      runtime:     candidate.runtime,
      voteAverage: candidate.voteAverage,
      groupFit:    candidate.groupFit,
      explanation: candidate.explanation,
      position:    candidate.position,
      voteCount:   candidate.votes.length,
      myVote:      (mine?.value as MovieNightVoteValue | undefined) ?? null,
    }
  })

  const matchedCandidate = candidates.find(candidate => candidate.id === room.matchedCandidateId) ?? null
  const matchedVotes = room.candidates.find(candidate => candidate.id === room.matchedCandidateId)?.votes ?? []
  const matchKind = matchedCandidate
    ? matchedVotes.filter(vote => vote.value === 'watch').length === room.participants.length
      ? 'unanimous'
      : 'consensus'
    : null

  return {
    code: room.code,
    name: room.name,
    mood: room.mood,
    status,
    expiresAt: room.expiresAt.toISOString(),
    participantId: currentParticipant?.id ?? null,
    participantCount: room.participants.length,
    candidates,
    participants: room.participants.map(participant => ({
      id:          participant.id,
      displayName: participant.displayName,
      avatarUrl:   participant.avatarUrl,
      isHost:      participant.isHost,
      voteCount:   participant.votes.length,
      finished:    participant.votes.length >= candidateCount,
    })),
    matchedCandidate,
    matchKind,
  }
}

async function updateRoomOutcome(roomId: string) {
  const room = await prisma.movieNightRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { select: { id: true } },
      candidates: {
        include: { votes: { select: { value: true } } },
        orderBy: { position: 'asc' },
      },
    },
  })

  if (!room || room.status !== 'voting' || room.participants.length < 2) return

  const outcome = decideMovieNightOutcome(room.candidates, room.participants.length)
  if (!outcome) return

  await prisma.movieNightRoom.update({
    where: { id: room.id },
    data: {
      status: outcome.status,
      matchedCandidateId: outcome.matchedCandidateId,
    },
  })
}

export async function castLiveMovieNightVote(
  codeInput: string,
  token: string,
  candidateId: string,
  value: MovieNightVoteValue,
) {
  if (!['watch', 'maybe', 'pass'].includes(value)) roomError('Invalid vote', 400)

  const code = codeInput.trim().toUpperCase()
  const participant = await prisma.movieNightRoomParticipant.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { room: { select: { id: true, code: true, status: true, expiresAt: true } } },
  })

  if (!participant || participant.room.code !== code) roomError('Join this room before voting', 401)
  if (participant.room.status !== 'voting' || participant.room.expiresAt <= new Date()) {
    roomError(participant.room.status === 'lobby' ? 'Voting has not started yet' : 'Voting has ended', 409)
  }

  const candidate = await prisma.movieNightRoomCandidate.findFirst({
    where: { id: candidateId, roomId: participant.room.id },
    select: { id: true },
  })
  if (!candidate) roomError('Movie is not in this room', 400)

  await prisma.movieNightVote.upsert({
    where: {
      participantId_candidateId: { participantId: participant.id, candidateId: candidate.id },
    },
    create: { participantId: participant.id, candidateId: candidate.id, value },
    update: { value },
  })

  await updateRoomOutcome(participant.room.id)
}
