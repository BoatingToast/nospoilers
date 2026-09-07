export const THEATER_CAPACITIES = [24, 48, 96] as const
export const THEATER_PRESENCE_MS = 45_000

export type TheaterKind = 'film' | 'trailer'
export type TheaterStatus = 'upcoming' | 'live' | 'ended' | 'cancelled'

export interface TheaterAvatar {
  skin: string
  suit: string
  accent: string
  silhouette: 'sleek' | 'classic' | 'cosmic'
  accessory: 'visor' | 'headphones' | 'halo' | 'none'
}

export const DEFAULT_THEATER_AVATAR: TheaterAvatar = {
  skin: '#b76e52', suit: '#151d46', accent: '#9d7cff', silhouette: 'classic', accessory: 'visor',
}

export interface TheaterPremiere {
  id: string
  title: string
  description: string
  kind: TheaterKind
  startsAt: string
  endsAt: string
  durationSeconds: number
  capacity: number
  promoted: boolean
  adCopy: string | null
  status: TheaterStatus
  creatorName: string
  isOwner: boolean
  reservedSeats: number
}

export interface TheaterParticipant {
  userId: string
  name: string
  seat: number
  avatar: TheaterAvatar
  present: boolean
}

export interface TheaterRoomData {
  premiere: TheaterPremiere
  serverNow: string
  participants: TheaterParticipant[]
  viewerId: string
  mySeat: number | null
  myRating: number | null
  ratingRequired: boolean
  pendingRatingId: string | null
  ratingSummary: { count: number; average: number | null } | null
}

export class TheaterError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'TheaterError'
    this.status = status
  }
}

export function theaterStatus(
  premiere: { startsAt: Date | string; endsAt: Date | string; cancelledAt?: Date | string | null },
  now = Date.now(),
): TheaterStatus {
  if (premiere.cancelledAt) return 'cancelled'
  if (now < new Date(premiere.startsAt).getTime()) return 'upcoming'
  return now < new Date(premiere.endsAt).getTime() ? 'live' : 'ended'
}

export function playbackPosition(startsAt: string | Date, durationSeconds: number, now: number) {
  return Math.max(0, Math.min(durationSeconds, (now - new Date(startsAt).getTime()) / 1000))
}

export function requiresTheaterRating(input: {
  isOwner: boolean; watchedAt: Date | string | null; rating: number | null; status: TheaterStatus
}) {
  return !input.isOwner && input.watchedAt !== null && input.rating === null && input.status === 'ended'
}

export function normalizeTheaterAvatar(value: unknown): TheaterAvatar {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const color = (key: 'skin' | 'suit' | 'accent') => typeof candidate[key] === 'string' && /^#[\da-f]{6}$/i.test(candidate[key])
    ? candidate[key] : DEFAULT_THEATER_AVATAR[key]
  return {
    skin: color('skin'), suit: color('suit'), accent: color('accent'),
    silhouette: candidate.silhouette === 'sleek' || candidate.silhouette === 'cosmic' ? candidate.silhouette : 'classic',
    accessory: candidate.accessory === 'headphones' || candidate.accessory === 'halo' || candidate.accessory === 'none' ? candidate.accessory : 'visor',
  }
}

export function seatPosition(seat: number) {
  const row = Math.floor(seat / 8)
  const column = seat % 8
  return { x: (column - 3.5) * 1.15 + (column < 4 ? -0.6 : 0.6), y: row * 0.3, z: row * 1.65 }
}

export function seatLabel(seat: number) {
  return `${String.fromCharCode(65 + Math.floor(seat / 8))}${seat % 8 + 1}`
}

export function nextAvailableSeat(capacity: number, occupied: number[]) {
  const taken = new Set(occupied)
  // Seat each newcomer near the center; keep assignments stable across reconnects.
  return Array.from({ length: capacity }, (_, seat) => seat)
    .filter(seat => !taken.has(seat))
    .sort((a, b) => {
      const score = (seat: number) => Math.abs(Math.floor(seat / 8) - Math.floor(capacity / 16)) * 10 + Math.abs(seat % 8 - 3.5)
      return score(a) - score(b) || a - b
    })[0] ?? null
}

export function parsePremiereInput(value: unknown, now = Date.now()) {
  if (!value || typeof value !== 'object') throw new TheaterError('Add the premiere details.')
  const body = value as Record<string, unknown>
  const string = (key: string) => typeof body[key] === 'string' ? body[key].trim() : ''
  const title = string('title')
  const description = string('description')
  const uploadId = string('uploadId')
  const adCopy = string('adCopy')
  const startsAt = new Date(string('startsAt'))
  if (!title || title.length > 120) throw new TheaterError('Give your premiere a title of 1–120 characters.')
  if (description.length > 1000) throw new TheaterError('Keep the description under 1,000 characters.')
  if (!uploadId || uploadId.length > 128) throw new TheaterError('Choose one of your completed uploads.')
  if (body.kind !== 'film' && body.kind !== 'trailer') throw new TheaterError('Choose a film or trailer premiere.')
  if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() < now + 60_000 || startsAt.getTime() > now + 365 * 86400_000) {
    throw new TheaterError('Schedule your premiere at least one minute ahead, within the next year.')
  }
  const durationSeconds = body.durationSeconds
  if (typeof durationSeconds !== 'number' || !Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 14_400) {
    throw new TheaterError('Choose a playable video between one second and four hours long.')
  }
  if (!THEATER_CAPACITIES.some(capacity => capacity === body.capacity)) throw new TheaterError('Choose a 24, 48, or 96 seat theater.')
  if (body.promoted !== undefined && typeof body.promoted !== 'boolean') throw new TheaterError('Choose whether to promote this premiere.')
  if (adCopy.length > 180 || (body.promoted && !adCopy)) throw new TheaterError('Add an ad headline of 1–180 characters.')
  return {
    title, description, uploadId, kind: body.kind, startsAt,
    endsAt: new Date(startsAt.getTime() + durationSeconds * 1000), durationSeconds,
    capacity: body.capacity as number, promoted: body.promoted === true, adCopy: body.promoted ? adCopy : null,
  }
}

export function parseTheaterRating(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new TheaterError('Choose a rating from 1 to 5 stars.')
  }
  return value
}
