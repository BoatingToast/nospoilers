import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import type { MovieNightLiveState, MovieNightVoteValue } from '@/types'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_CANDIDATES = 12
const MAX_PARTICIPANTS = 12
const ROOM_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

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
        ? candidate.genreIds.filter(Number.isInteger).slice(0, 12)
        : [],
      runtime:     Number.isInteger(candidate.runtime) ? candidate.runtime : null,
      voteAverage: typeof candidate.voteAverage === 'number' && Number.isFinite(candidate.voteAverage)
        ? candidate.voteAverage
        : null,
      groupFit:    Math.max(1, Math.min(99, Math.round(candidate.groupFit || 1))),
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

  if (!host) throw new Error('Host not found')

  const candidates = normalizeCandidates(input.candidates ?? [])
  if (candidates.length < 2) throw new Error('At least two movie candidates are required')

  const token = makeParticipantToken()
  await prisma.movieNightRoom.create({
    data: {
      code,
      hostId,
      name:          cleanName(input.name, 'Movie Night'),
      mood:          cleanName(input.mood, 'crowd').toLowerCase().slice(0, 24),
      maxRuntime:    Number.isInteger(input.maxRuntime) ? input.maxRuntime : null,
      vetoGenres:    Array.isArray(input.vetoGenres) ? input.vetoGenres.filter(Number.isInteger).slice(0, 12) : [],
      unseenOnly:    input.unseenOnly !== false,
      avoidDivisive: input.avoidDivisive === true,
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
) {
  const code = codeInput.trim().toUpperCase()
  const room = await prisma.movieNightRoom.findUnique({
    where: { code },
    include: { participants: { select: { id: true, userId: true } } },
  })

  if (!room || room.expiresAt <= new Date()) throw new Error('Room not found or expired')
  if (room.status !== 'voting') throw new Error('Voting has already ended')

  const token = makeParticipantToken()
  const tokenHash = hashToken(token)
  const displayName = cleanName(displayNameInput, user?.username ?? 'Guest')
  const existing = user ? room.participants.find(participant => participant.userId === user.id) : null
  if (!existing && room.participants.length >= MAX_PARTICIPANTS) throw new Error('This room is full')

  const participant = existing
    ? await prisma.movieNightRoomParticipant.update({
        where: { id: existing.id },
        data: { tokenHash, displayName, avatarUrl: user?.avatarUrl ?? null },
        select: { id: true },
      })
    : await prisma.movieNightRoomParticipant.create({
        data: {
          roomId: room.id,
          userId: user?.id ?? null,
          displayName,
          avatarUrl: user?.avatarUrl ?? null,
          tokenHash,
        },
        select: { id: true },
      })

  return { token, participantId: participant.id }
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
  if (room.expiresAt <= new Date() && status === 'voting') {
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

  const unanimous = room.candidates.find(candidate =>
    candidate.votes.filter(vote => vote.value === 'watch').length === room.participants.length,
  )

  if (unanimous) {
    await prisma.movieNightRoom.update({
      where: { id: room.id },
      data: { status: 'matched', matchedCandidateId: unanimous.id },
    })
    return
  }

  const allFinished = room.candidates.every(candidate => candidate.votes.length === room.participants.length)
  if (!allFinished) return

  const best = [...room.candidates].sort((a, b) => {
    const score = (candidate: typeof a) => candidate.votes.reduce((total, vote) => {
      if (vote.value === 'watch') return total + 2
      if (vote.value === 'maybe') return total + 1
      return total
    }, candidate.groupFit / 100)
    return score(b) - score(a) || a.position - b.position
  })[0]

  if (best) {
    await prisma.movieNightRoom.update({
      where: { id: room.id },
      data: { status: 'matched', matchedCandidateId: best.id },
    })
  }
}

export async function castLiveMovieNightVote(
  codeInput: string,
  token: string,
  candidateId: string,
  value: MovieNightVoteValue,
) {
  if (!['watch', 'maybe', 'pass'].includes(value)) throw new Error('Invalid vote')

  const code = codeInput.trim().toUpperCase()
  const participant = await prisma.movieNightRoomParticipant.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { room: { select: { id: true, code: true, status: true, expiresAt: true } } },
  })

  if (!participant || participant.room.code !== code) throw new Error('Join this room before voting')
  if (participant.room.status !== 'voting' || participant.room.expiresAt <= new Date()) {
    throw new Error('Voting has ended')
  }

  const candidate = await prisma.movieNightRoomCandidate.findFirst({
    where: { id: candidateId, roomId: participant.room.id },
    select: { id: true },
  })
  if (!candidate) throw new Error('Movie is not in this room')

  await prisma.movieNightVote.upsert({
    where: {
      participantId_candidateId: { participantId: participant.id, candidateId: candidate.id },
    },
    create: { participantId: participant.id, candidateId: candidate.id, value },
    update: { value },
  })

  await updateRoomOutcome(participant.room.id)
}
